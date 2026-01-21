// bot/adminHandlers.js
const axios = require("axios");
const { Markup } = require("telegraf");

// Helper function to create axios instance with admin headers
function createAdminAxios(telegramId) {
  return axios.create({
    baseURL: process.env.API_URL,
    headers: {
      "x-telegram-id": telegramId.toString(),
      "Content-Type": "application/json"
    },
    timeout: 10000
  });
}

// Helper function to delete message safely
async function safeDeleteMessage(ctx, messageId) {
  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
  } catch (err) {
    console.log("Could not delete message:", err.message);
  }
}

// Helper function to clear multiple messages
async function clearMessages(ctx, messageIds) {
  for (const msgId of messageIds) {
    await safeDeleteMessage(ctx, msgId);
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to avoid rate limits
  }
}

// Check if user is admin (checks database directly via API)
async function isAdmin(telegramId) {
  console.log("🔍 Checking admin status for Telegram ID:", telegramId);
  
  try {
    const url = `${process.env.API_URL}/admin/check`;
    console.log("📡 Making request to:", url);
    
    const res = await axios.post(url, {
      telegramId: telegramId.toString()
    }, {
      timeout: 5000
    });
    
    console.log("✅ Admin check response:", res.data);
    return res.data.isAdmin;
  } catch (err) {
    console.error("❌ Admin check error:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    if (err.code === 'ECONNREFUSED') {
      console.error("⚠️ API server is not running!");
    }
    return false;
  }
}

// Admin main menu
function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📦 Manage Products", "admin_products")],
    [Markup.button.callback("📋 View Orders", "admin_orders")],
    [Markup.button.callback("📊 Statistics", "admin_stats")],
    [Markup.button.callback("⬅ Back to Shop", "back_to_menu")]
  ]);
}

// Product management menu
function productMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ Add Product", "admin_add_product")],
    [Markup.button.callback("📝 View All Products", "admin_view_products")],
    [Markup.button.callback("🔄 Update Stock", "admin_update_stock")],
    [Markup.button.callback("🗑️ Remove Product", "admin_remove_product")],
    [Markup.button.callback("⬅ Back", "admin_menu")]
  ]);
}

// Orders menu
function ordersMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("⏳ Processing Orders", "admin_orders_processing")],
    [Markup.button.callback("🚚 Shipped Orders", "admin_orders_shipped")],
    [Markup.button.callback("✅ Delivered Orders", "admin_orders_delivered")],
    [Markup.button.callback("📋 All Orders", "admin_orders_all")],
    [Markup.button.callback("⬅ Back", "admin_menu")]
  ]);
}

/* ==========================
   REGISTER ADMIN HANDLERS
========================== */
function registerAdminHandlers(bot) {
  console.log("📝 Registering admin command handler...");

  // Admin command - main menu
  bot.command("admin", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.reply("⛔ This command is for admins only.");

    await ctx.reply(
      "🔐 *Admin Dashboard*\n\nWelcome to the admin panel!",
      { parse_mode: "Markdown", ...adminMenu() }
    );
  });

  // Admin menu callback
  bot.action("admin_menu", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    // Delete the previous message and send fresh menu
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.log("Could not delete message");
    }
    
    await ctx.reply(
      "🔐 *Admin Dashboard*\n\nWhat would you like to do?",
      { parse_mode: "Markdown", ...adminMenu() }
    );
  });

  /* ==========================
     PRODUCT MANAGEMENT
  ========================== */
  bot.action("admin_products", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    // Delete the previous message
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.log("Could not delete message");
    }
    
    await ctx.reply(
      "📦 *Product Management*\n\nChoose an action:",
      { parse_mode: "Markdown", ...productMenu() }
    );
  });

  // View all products (with pagination and message clearing)
  bot.action("admin_view_products", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");
    
    await ctx.answerCbQuery();

    try {
      const res = await axios.get(`${process.env.API_URL}/products`);
      const products = res.data;

      if (!products || products.length === 0) {
        // Delete previous message
        try {
          await ctx.deleteMessage();
        } catch (err) {}
        
        return ctx.reply("📦 No products found.", { ...productMenu() });
      }

      const PRODUCTS_PER_MESSAGE = 5;
      const chunks = [];
      for (let i = 0; i < products.length; i += PRODUCTS_PER_MESSAGE) {
        chunks.push(products.slice(i, i + PRODUCTS_PER_MESSAGE));
      }

      // Delete previous message
      try {
        await ctx.deleteMessage();
      } catch (err) {}

      const messageIds = [];

      const headerMsg = await ctx.reply(
        `📦 *All Products* (${products.length} total)\n\n` +
        `Showing in ${chunks.length} ${chunks.length === 1 ? 'message' : 'messages'}...`,
        { parse_mode: "Markdown" }
      );
      messageIds.push(headerMsg.message_id);

      for (let i = 0; i < chunks.length; i++) {
        let message = `*Page ${i + 1}/${chunks.length}:*\n\n`;
        chunks[i].forEach(p => {
          message += `🧴 *${p.name}*\nCategory: ${p.category}\nSizes:\n`;
          p.sizes?.forEach(s => {
            message += `  • ${s.size}ml - ₦${s.price} (Stock: ${s.stock})\n`;
          });
          message += `ID: \`${p._id}\`\n\n`;
        });
        const msg = await ctx.reply(message, { parse_mode: "Markdown" });
        messageIds.push(msg.message_id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const menuMsg = await ctx.reply("Choose an action:", { ...productMenu() });
      
      // Store message IDs for potential cleanup (optional enhancement)
      ctx.session = ctx.session || {};
      ctx.session.lastProductMessages = messageIds;

    } catch (err) {
      console.error(err.message);
      
      // Delete previous message
      try {
        await ctx.deleteMessage();
      } catch (err) {}
      
      await ctx.reply("❌ Failed to load products", { ...productMenu() });
    }
  });

  // (Other product management handlers remain unchanged: addproduct, updatestock, removeproduct)

  /* ==========================
     ORDER MANAGEMENT
  ========================== */
  bot.action("admin_orders", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    // Delete the previous message
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.log("Could not delete message");
    }
    
    await ctx.reply(
      "📋 *Order Management*\n\nChoose a filter:",
      { parse_mode: "Markdown", ...ordersMenu() }
    );
  });

  // Show orders helper (with status update buttons and message clearing)
  async function showOrders(ctx, status = null) {
    try {
      const adminAxios = createAdminAxios(ctx.from.id);
      const url = status ? `/admin/orders?status=${status}` : `/admin/orders`;
      const res = await adminAxios.get(url);
      const orders = res.data.orders;

      if (!orders || orders.length === 0) {
        // Delete previous message
        try {
          await ctx.deleteMessage();
        } catch (err) {}
        
        return ctx.reply(`📋 No ${status || ''} orders found.`, { ...ordersMenu() });
      }

      const ORDERS_PER_MESSAGE = 3;
      const chunks = [];
      for (let i = 0; i < orders.length; i += ORDERS_PER_MESSAGE) {
        chunks.push(orders.slice(i, i + ORDERS_PER_MESSAGE));
      }

      // Delete previous message
      try {
        await ctx.deleteMessage();
      } catch (err) {}

      const totalOrders = orders.length;
      await ctx.reply(
        `📋 *${status ? status.toUpperCase() : 'Recent'} Orders* (${totalOrders} total)\n\n` +
        `Showing in ${chunks.length} ${chunks.length === 1 ? 'message' : 'messages'}...`,
        { parse_mode: "Markdown" }
      );

      for (let i = 0; i < chunks.length; i++) {
        for (const order of chunks[i]) {
          let message = `📦 *Order #${order._id}*\n`;
          message += `👤 Customer: ${order.customerName || order.telegramId}\n`;
          message += `💰 Total: ₦${order.total}\n`;
          message += `📍 Location: ${order.delivery_location || "N/A"}\n`;
          if (order.delivery_address) message += `📮 Address: ${order.delivery_address}\n`;
          message += `📊 Status: ${order.status}\n`;
          message += `💳 Payment: ${order.paymentStatus}\n\n🛍 *Items:*\n`;
          order.items.forEach(item => {
            const productName = item.product?.name || item.productName || "Unknown";
            message += `  • ${productName} (${item.size}ml) x${item.quantity}\n`;
          });

          // Inline buttons to update status
          const statusButtons = Markup.inlineKeyboard([
            ["SHIPPED", "DELIVERED", "CANCELLED"]
          ].map(row => row.map(s => Markup.button.callback(s, `update_order_${order._id}_${s}`))));

          await ctx.reply(message, { parse_mode: "Markdown", ...statusButtons });
        }
      }

      await ctx.reply("Choose an action:", { ...ordersMenu() });
    } catch (err) {
      console.error(err.message);
      
      // Delete previous message
      try {
        await ctx.deleteMessage();
      } catch (err) {}
      
      await ctx.reply("❌ Failed to load orders", { ...ordersMenu() });
    }
  }

  // View orders by status
  ["processing", "shipped", "delivered", "all"].forEach(key => {
    bot.action(`admin_orders_${key}`, async (ctx) => {
      const adminStatus = await isAdmin(ctx.from.id);
      if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");
      await ctx.answerCbQuery();
      const statusMap = {
        processing: "PROCESSING",
        shipped: "SHIPPED",
        delivered: "DELIVERED",
        all: null
      };
      await showOrders(ctx, statusMap[key]);
    });
  });

  // Update order status action with custom messages
  bot.action(/^update_order_(.+)_(.+)$/, async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery();

    const [, orderId, newStatus] = ctx.match;

    try {
      // Use axios instance with admin headers
      const adminAxios = createAdminAxios(ctx.from.id);

      // Send PATCH request to update status
      const res = await adminAxios.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus
      });

      // Access the actual order object from API response
      const updatedOrder = res.data.order;

      if (!updatedOrder) {
        return await ctx.reply("❌ Failed to fetch updated order data.");
      }

      // Delete the message with the status buttons to keep chat clean
      try {
        await ctx.deleteMessage();
      } catch (err) {
        console.log("Could not delete status update message");
      }

      // Confirm to admin
      await ctx.reply(
        `✅ Order ${orderId} status updated to *${newStatus}*`,
        { parse_mode: "Markdown" }
      );

      // Notify the user with custom messages based on status
      try {
        if (updatedOrder.telegramId) {
          let userMessage = "";
          
          switch (newStatus) {
            case "SHIPPED":
              userMessage = `🚚 Hi ${updatedOrder.customerName || "Customer"}, great news! Your order #${orderId} is on its way! 📦\n\nYou should receive it soon. Track your delivery for updates.`;
              break;
            case "DELIVERED":
              userMessage = `✅ Hi ${updatedOrder.customerName || "Customer"}, your order #${orderId} has been delivered! 🎉\n\nThank you for shopping with us!`;
              break;
            case "CANCELLED":
              userMessage = `❌ Hi ${updatedOrder.customerName || "Customer"}, your order #${orderId} has been cancelled.\n\nIf you have any questions, please contact support.`;
              break;
            case "PROCESSING":
              userMessage = `⏳ Hi ${updatedOrder.customerName || "Customer"}, your order #${orderId} is being processed.\n\nWe'll notify you once it ships!`;
              break;
            default:
              userMessage = `📦 Hi ${updatedOrder.customerName || "Customer"}, your order #${orderId} status is now *${newStatus}*`;
          }
          
          await ctx.telegram.sendMessage(
            updatedOrder.telegramId,
            userMessage,
            { parse_mode: "Markdown" }
          );
        }
      } catch (err) {
        console.error(`❌ Failed to notify user ${updatedOrder.telegramId}:`, err.message);
      }

    } catch (err) {
      console.error(err.response?.data || err.message);
      await ctx.reply("❌ Failed to update order status.");
    }
  });

  console.log("✅ All admin handlers registered successfully");
}

module.exports = { registerAdminHandlers, isAdmin };