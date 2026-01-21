// jobs/cancelExpiredOrders.js
const cron = require("node-cron");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");

/**
 * Initialize all cron jobs
 * @param {Telegraf} bot - Pass the bot instance to send Telegram messages
 */
function initCronJobs(bot) {
  
  /* ============================================
     JOB 1: CANCEL EXPIRED ORDERS (Every 5 min)
  ============================================ */
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏱ Checking for expired unpaid orders...");

    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const expiredOrders = await Order.find({
          paymentStatus: "UNPAID",
          expiresAt: { $lt: new Date() },
          status: { $ne: "CANCELLED" }
        }).session(session);

        if (expiredOrders.length === 0) {
          await session.commitTransaction();
          session.endSession();
          console.log("✅ No expired orders found.");
          return;
        }

        console.log(`Found ${expiredOrders.length} expired orders to cancel...`);

        for (const order of expiredOrders) {
          // 🔁 Restore stock only if it was reserved earlier
          for (const item of order.items) {
            const product = await Product.findById(item.product).session(session);
            if (!product) continue;

            const sizeEntry = product.sizes.find(
              s => s.size === item.size
            );

            if (sizeEntry) {
              sizeEntry.stock += item.quantity;
              await product.save({ session });
              console.log(`  ✅ Restored ${item.quantity}x ${item.productName} (${item.size}ml)`);
            }
          }

          // ❌ Cancel order
          order.status = "CANCELLED";
          order.paymentStatus = "FAILED";
          await order.save({ session });

          console.log(`❌ Order ${order._id} cancelled (timeout)`);

          // 📱 Send reminder message to user
          if (bot) {
            try {
              await bot.telegram.sendMessage(
                order.telegramId,
                `⏰ *Your order has expired!*\n\n` +
                `Your payment link expired after 30 minutes.\n\n` +
                `Good news: The items are back in stock! 🎉\n\n` +
                `Your cart:${order.items.map(i => `\n• ${i.productName} (${i.size}ml) x${i.quantity}`).join("")}\n\n` +
                `*Total: ₦${order.total}*\n\n` +
                `Want to complete your purchase?`,
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🛒 View Cart", callback_data: "view_cart" }],
                      [{ text: "🛍 Continue Shopping", callback_data: "back_to_menu" }]
                    ]
                  }
                }
              );
              console.log(`  📱 Sent expiry reminder to user ${order.telegramId}`);
            } catch (msgErr) {
              console.error(`  ⚠️ Failed to send message to ${order.telegramId}:`, msgErr.message);
            }
          }
        }

        await session.commitTransaction();
        session.endSession();
        console.log(`✅ Cancelled ${expiredOrders.length} expired orders\n`);

      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } catch (err) {
      console.error("❌ Cancel job error:", err);
    }
  });

  /* ============================================
     JOB 2: ABANDONED CART REMINDERS (Every 6 hours)
  ============================================ */
  cron.schedule("0 */6 * * *", async () => {
    console.log("🛒 Checking for abandoned carts...");

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find carts that have items and haven't been updated in 24 hours
      const abandonedCarts = await Cart.find({
        "items.0": { $exists: true }, // Has at least one item
        updatedAt: { $lte: oneDayAgo },
        reminderSent: { $ne: true } // Haven't sent reminder yet
      }).populate("items.product");

      if (abandonedCarts.length === 0) {
        console.log("💤 No abandoned carts found.\n");
        return;
      }

      console.log(`🛒 Found ${abandonedCarts.length} abandoned carts...`);

      for (const cart of abandonedCarts) {
        if (!bot) continue;

        try {
          const itemsList = cart.items
            .map(i => `• ${i.product.name} (${i.size}ml) x${i.quantity}`)
            .join("\n");

          const subtotal = cart.items.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0
          );

          await bot.telegram.sendMessage(
            cart.telegramId,
            `👋 *Still thinking about your order?*\n\n` +
            `You left these items in your cart:\n${itemsList}\n\n` +
            `*Subtotal: ₦${subtotal}*\n\n` +
            `Don't miss out! Complete your order now. 💛`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🛒 View Cart", callback_data: "view_cart" }],
                  [{ text: "🛍 Continue Shopping", callback_data: "back_to_menu" }]
                ]
              }
            }
          );

          // Mark reminder as sent so we don't spam them
          cart.reminderSent = true;
          await cart.save();

          console.log(`  📱 Sent abandoned cart reminder to user ${cart.telegramId}`);
        } catch (msgErr) {
          console.error(`  ⚠️ Failed to send reminder to ${cart.telegramId}:`, msgErr.message);
        }
      }

      console.log(`✅ Sent ${abandonedCarts.length} abandoned cart reminders\n`);
    } catch (err) {
      console.error("❌ Abandoned cart reminder error:", err.message);
    }
  });

  console.log("📅 Cron jobs initialized:");
  console.log("  • Cancel expired orders: every 5 minutes");
  console.log("  • Abandoned cart reminders: every 6 hours\n");
}

module.exports = { initCronJobs };