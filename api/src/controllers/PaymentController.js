// controllers/PaymentController.js
const crypto = require("crypto");
const Order = require("../models/Order");
const { notifyUser } = require("bot/src/utils/notifyUser.js");
const { notifyAdmin } = require("bot/src/utils/notifyAdmin.js");

/* ==========================
   VERIFY KORAPAY SIGNATURE
========================== */
function verifyKorapaySignature(dataObject, signature) {
  const secret = process.env.KORAPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ KORAPAY_WEBHOOK_SECRET is not set in .env");
    return false;
  }
  const dataString = JSON.stringify(dataObject);
  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataString)
    .digest("hex");
  
  console.log("🔐 Signature verification:");
  console.log("  Expected:", signature);
  console.log("  Calculated:", hash);
  console.log("  Match:", hash === signature);
  
  return hash === signature;
}

/* ==========================
   KORAPAY WEBHOOK
========================== */
exports.paymentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-korapay-signature"];
    const { event, data } = req.body;

    console.log("📥 Webhook received:");
    console.log("  Event:", event);
    console.log("  Reference:", data?.reference);

    if (!signature || !data) {
      console.warn("⚠️ Invalid payload or missing signature");
      return res.status(400).json({ error: "Invalid payload or missing signature" });
    }

    if (!verifyKorapaySignature(data, signature)) {
      console.warn("⚠️ Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("✅ Signature verified!");

    if (event !== "charge.success") {
      console.log(`ℹ️ Ignoring event: ${event}`);
      return res.status(200).json({ received: true });
    }

    const { reference, status } = data;

    const order = await Order.findOne({ paymentReference: reference });

    if (!order) {
      console.error(`❌ Order not found for reference: ${reference}`);
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus === "PAID") {
      console.log(`ℹ️ Order ${order._id} already marked as PAID`);
      return res.status(200).json({ received: true });
    }

    if (status === "success") {
      order.paymentStatus = "PAID";
      order.status = "PROCESSING";
      order.paidAt = new Date();
      order.paymentChannel = "KORAPAY";
      order.expiresAt = null;

      await order.save();
      console.log(`✅ Order ${order._id} marked as PAID`);

      // ✅ AWAIT user notification
      try {
        await notifyUser(
          order.telegramId,
          `✅ *Payment Confirmed!*\n\n` +
          `🧾 Order ID: \`${order._id}\`\n` +
          `📦 Items:${order.items.map(i => `\n• ${i.productName} (${i.size}ml) x${i.quantity}`).join("")}\n` +
          `💰 Total: ₦${order.total}\n` +
          `📍 Location: ${order.delivery_location || "N/A"}\n` +
          `📮 Address: ${order.delivery_address || "N/A"}\n\n` +
          `🚚 Your order is being processed!`
        );
        console.log("✅ Customer notified successfully");
      } catch (notifyErr) {
        console.error("❌ Failed to notify customer:", notifyErr.message);
      }

      // ✅ AWAIT admin notification
      try {
        await notifyAdmin(order);
        console.log("✅ Admins notified successfully");
      } catch (adminErr) {
        console.error("❌ Failed to notify admins:", adminErr.message);
      }

      return res.status(200).json({ success: true });
    }

    // Payment failed
    order.paymentStatus = "FAILED";
    order.status = "CANCELLED";
    order.expiresAt = null;

    await order.save();
    console.log(`❌ Order ${order._id} marked as FAILED`);

    // ✅ AWAIT failed payment notification
    try {
      await notifyUser(
        order.telegramId,
        `❌ *Payment Failed*\n\nYour order was cancelled. You can try again anytime.`
      );
      console.log("✅ Failure notification sent to customer");
    } catch (notifyErr) {
      console.error("❌ Failed to notify customer about failure:", notifyErr.message);
    }

    res.status(200).json({ success: false });

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};


