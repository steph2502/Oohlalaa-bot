// bot/adminHandlers.js
const axios = require("axios");
const { Markup } = require("telegraf");

// User sessions to track admin actions
const adminSessions = new Map();

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

// Check if user is admin (checks database directly via API)
async function isAdmin(telegramId) {
  try {
    const url = `${process.env.API_URL}/admin/check`;
    const res = await axios.post(url, {
      telegramId: telegramId.toString()
    }, {
      timeout: 5000
    });
    return res.data.isAdmin;
  } catch (err) {
    console.error("❌ Admin check error:", err.message);
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
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}
    
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
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}
    
    await ctx.reply(
      "📦 *Product Management*\n\nChoose an action:",
      { parse_mode: "Markdown", ...productMenu() }
    );
  });

  // View all products
  bot.action("admin_view_products", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");
    
    await ctx.answerCbQuery();

    try {
      const res = await axios.get(`${process.env.API_URL}/products`);
      const products = res.data;

      if (!products || products.length === 0) {
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

      try {
        await ctx.deleteMessage();
      } catch (err) {}

      await ctx.reply(
        `📦 *All Products* (${products.length} total)\n\n` +
        `Showing in ${chunks.length} ${chunks.length === 1 ? 'message' : 'messages'}...`,
        { parse_mode: "Markdown" }
      );

      for (let i = 0; i < chunks.length; i++) {
        let message = `*Page ${i + 1}/${chunks.length}:*\n\n`;
        chunks[i].forEach(p => {
          message += `🧴 *${p.name}*\nCategory: ${p.category}\nSizes:\n`;
          p.sizes?.forEach(s => {
            message += `  • ${s.size}ml - ₦${s.price?.toLocaleString()} (Stock: ${s.stock})\n`;
          });
          message += `ID: \`${p._id}\`\n\n`;
        });
        await ctx.reply(message, { parse_mode: "Markdown" });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await ctx.reply("Choose an action:", { ...productMenu() });

    } catch (err) {
      console.error(err.message);
      
      try {
        await ctx.deleteMessage();
      } catch (err) {}
      
      await ctx.reply("❌ Failed to load products", { ...productMenu() });
    }
  });

  /* ==========================
     ADD PRODUCT
  ========================== */
  bot.action("admin_add_product", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}

    await ctx.reply(
      "➕ *Add New Product*\n\n" +
      "Please send the product details in this format:\n\n" +
      "```\n" +
      "NAME: Product Name\n" +
      "CATEGORY: classic|premium|luxury\n" +
      "SIZES: 3:1500:10,10:4500:20\n" +
      "```\n\n" +
      "Format for SIZES: `size:price:stock,size:price:stock`\n" +
      "Example: `3:1500:10` means 3ml size costs ₦1500 with 10 in stock",
      { parse_mode: "Markdown", ...productMenu() }
    );

    // Store state for this user
    adminSessions.set(ctx.from.id, { awaitingProductData: true });
  });

  /* ==========================
     UPDATE STOCK
  ========================== */
  bot.action("admin_update_stock", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}

    await ctx.reply(
      "🔄 *Update Product Stock*\n\n" +
      "Please send the update details in this format:\n\n" +
      "```\n" +
      "ID: product_id_here\n" +
      "SIZE: 3\n" +
      "STOCK: 25\n" +
      "```\n\n" +
      "This will set the stock for 3ml size to 25 units.",
      { parse_mode: "Markdown", ...productMenu() }
    );

    adminSessions.set(ctx.from.id, { awaitingStockUpdate: true });
  });

  /* ==========================
     REMOVE PRODUCT
  ========================== */
  bot.action("admin_remove_product", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}

    await ctx.reply(
      "🗑️ *Remove Product*\n\n" +
      "Please send the product ID to remove:\n\n" +
      "```\nID: product_id_here\n```\n\n" +
      "⚠️ This action cannot be undone!",
      { parse_mode: "Markdown", ...productMenu() }
    );

    adminSessions.set(ctx.from.id, { awaitingProductRemoval: true });
  });

  /* ==========================
     TEXT INPUT HANDLERS (ONLY FOR ADMIN SESSIONS)
  ========================== */
  bot.on("text", async (ctx, next) => {
    const userId = ctx.from.id;
    const session = adminSessions.get(userId);
    
    // ✅ If no admin session, skip to next handler (important for delivery address, etc.)
    if (!session) {
      return next();
    }

    // ✅ Verify user is still admin
    const adminStatus = await isAdmin(userId);
    if (!adminStatus) {
      adminSessions.delete(userId);
      return next();
    }

    const text = ctx.message.text;

    // Handle Add Product
    if (session.awaitingProductData) {
      try {
        const nameMatch = text.match(/NAME:\s*(.+)/i);
        const categoryMatch = text.match(/CATEGORY:\s*(.+)/i);
        const sizesMatch = text.match(/SIZES:\s*(.+)/i);

        if (!nameMatch || !categoryMatch || !sizesMatch) {
          return ctx.reply("❌ Invalid format. Please include NAME, CATEGORY, and SIZES.");
        }

        const name = nameMatch[1].trim();
        const category = categoryMatch[1].trim().toLowerCase();
        const sizesRaw = sizesMatch[1].trim();

        const sizes = sizesRaw.split(',').map(s => {
          const [size, price, stock] = s.trim().split(':');
          return {
            size: parseInt(size),
            price: parseFloat(price),
            stock: parseInt(stock)
          };
        });

        const productData = { name, category, sizes };

        const adminAxios = createAdminAxios(userId);
        const res = await adminAxios.post('/admin/products', productData);

        adminSessions.delete(userId);

        await ctx.reply(
          `✅ Product created successfully!\n\n` +
          `📦 *${res.data.product.name}*\n` +
          `Category: ${res.data.product.category}\n` +
          `ID: \`${res.data.product._id}\``,
          { parse_mode: "Markdown", ...productMenu() }
        );

      } catch (err) {
        console.error(err.response?.data || err.message);
        adminSessions.delete(userId);
        await ctx.reply("❌ Failed to create product. Please try again.", { ...productMenu() });
      }
      return;
    }

    // Handle Update Stock
    if (session.awaitingStockUpdate) {
      try {
        const idMatch = text.match(/ID:\s*(.+)/i);
        const sizeMatch = text.match(/SIZE:\s*(\d+)/i);
        const stockMatch = text.match(/STOCK:\s*(\d+)/i);

        if (!idMatch || !sizeMatch || !stockMatch) {
          return ctx.reply("❌ Invalid format. Please include ID, SIZE, and STOCK.");
        }

        const productId = idMatch[1].trim();
        const size = parseInt(sizeMatch[1]);
        const stock = parseInt(stockMatch[1]);

        const adminAxios = createAdminAxios(userId);
        const res = await adminAxios.patch(`/admin/products/${productId}/stock`, {
          size,
          stock
        });

        adminSessions.delete(userId);

        await ctx.reply(
          `✅ Stock updated successfully!\n\n` +
          `📦 ${res.data.product.name}\n` +
          `Size: ${size}ml\n` +
          `New Stock: ${stock}`,
          { parse_mode: "Markdown", ...productMenu() }
        );

      } catch (err) {
        console.error(err.response?.data || err.message);
        adminSessions.delete(userId);
        await ctx.reply("❌ Failed to update stock. Please check the product ID and try again.", { ...productMenu() });
      }
      return;
    }

    // Handle Remove Product
    if (session.awaitingProductRemoval) {
      try {
        const idMatch = text.match(/ID:\s*(.+)/i);

        if (!idMatch) {
          return ctx.reply("❌ Invalid format. Please include ID.");
        }

        const productId = idMatch[1].trim();

        await ctx.reply(
          `⚠️ Are you sure you want to delete this product?\n\nID: \`${productId}\`\n\n` +
          "This action cannot be undone!",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback("✅ Yes, Delete", `confirm_delete_${productId}`),
                Markup.button.callback("❌ Cancel", "admin_products")
              ]
            ])
          }
        );

        adminSessions.delete(userId);

      } catch (err) {
        console.error(err.message);
        adminSessions.delete(userId);
        await ctx.reply("❌ Failed to process request.", { ...productMenu() });
      }
      return;
    }
  });

  // Confirm product deletion
  bot.action(/^confirm_delete_(.+)$/, async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();

    const productId = ctx.match[1];

    try {
      const adminAxios = createAdminAxios(ctx.from.id);
      await adminAxios.delete(`/admin/products/${productId}`);

      try {
        await ctx.deleteMessage();
      } catch (err) {}

      await ctx.reply(
        `✅ Product deleted successfully!\n\nID: \`${productId}\``,
        { parse_mode: "Markdown", ...productMenu() }
      );

    } catch (err) {
      console.error(err.response?.data || err.message);
      
      try {
        await ctx.deleteMessage();
      } catch (err) {}
      
      await ctx.reply("❌ Failed to delete product. Please check the ID and try again.", { ...productMenu() });
    }
  });

  /* ==========================
     STATISTICS
  ========================== */
  bot.action("admin_stats", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();

    try {
      const adminAxios = createAdminAxios(ctx.from.id);
      const res = await adminAxios.get('/admin/stats');
      const stats = res.data;

      try {
        await ctx.deleteMessage();
      } catch (err) {}

      await ctx.reply(
        `📊 *Dashboard Statistics*\n\n` +
        `👥 Total Users: ${stats.totalUsers || 0}\n` +
        `📦 Total Products: ${stats.totalProducts || 0}\n` +
        `📋 Total Orders: ${stats.totalOrders || 0}\n` +
        `💰 Total Revenue: ₦${stats.totalRevenue?.toLocaleString() || 0}\n\n` +
        `⏳ Processing: ${stats.processingOrders || 0}\n` +
        `🚚 Shipped: ${stats.shippedOrders || 0}\n` +
        `✅ Delivered: ${stats.deliveredOrders || 0}`,
        { parse_mode: "Markdown", ...adminMenu() }
      );

    } catch (err) {
      console.error(err.message);
      
      try {
        await ctx.deleteMessage();
      } catch (err) {}
      
      await ctx.reply("❌ Failed to load statistics", { ...adminMenu() });
    }
  });

  /* ==========================
     ORDER MANAGEMENT
  ========================== */
  bot.action("admin_orders", async (ctx) => {
    const adminStatus = await isAdmin(ctx.from.id);
    if (!adminStatus) return ctx.answerCbQuery("⛔ Admin only");

    await ctx.answerCbQuery();
    
    try {
      await ctx.deleteMessage();
    } catch (err) {}
    
    await ctx.reply(
      "📋 *Order Management*\n\nChoose a filter:",
      { parse_mode: "Markdown", ...ordersMenu() }
    );
  });

  // Show orders helper
  async function showOrders(ctx, status = null) {
    try {
      const adminAxios = createAdminAxios(ctx.from.id);
      const url = status ? `/admin/orders?status=${status}` : `/admin/orders`;
      const res = await adminAxios.get(url);
      const orders = res.data.orders;

      if (!orders || orders.length === 0) {
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
          const createdDate = order.createdAt 
            ? new Date(order.createdAt).toLocaleString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';

          let message = `📦 *Order #${order._id.slice(-8)}*\n\n`;
          message += `👤 Customer: ${order.customerName || order.telegramId}\n`;
          message += `💰 Total: ₦${order.total?.toLocaleString() || 0}\n`;
          message += `📍 Location: ${order.delivery_location || "N/A"}\n`;
          if (order.delivery_address) message += `📮 Address: ${order.delivery_address}\n`;
          message += `📊 Status: ${order.status}\n`;
          message += `💳 Payment: ${order.paymentStatus}\n\n`;
          message += `📅 Created: ${createdDate}\n\n`;
          message += `🛍 *Items:*\n`;
          order.items.forEach(item => {
            const productName = item.product?.name || item.productName || "Unknown";
            const itemTotal = (item.price * item.quantity) || 0;
            message += `  • ${productName} (${item.size}ml) x${item.quantity} - ₦${itemTotal.toLocaleString()}\n`;
          });

          const statusButtons = Markup.inlineKeyboard([
            [
              Markup.button.callback("🚚 SHIPPED", `update_order_${order._id}_SHIPPED`),
              Markup.button.callback("✅ DELIVERED", `update_order_${order._id}_DELIVERED`)
            ],
            [
              Markup.button.callback("❌ CANCELLED", `update_order_${order._id}_CANCELLED`),
              Markup.button.callback("⏳ PROCESSING", `update_order_${order._id}_PROCESSING`)
            ]
          ]);

          await ctx.reply(message, { parse_mode: "Markdown", ...statusButtons });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await ctx.reply("Choose an action:", { ...ordersMenu() });
    } catch (err) {
      console.error(err.message);
      
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

  // Update order status
  bot.action(/^update_order_(.+)_(.+)$/, async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery();

    const [, orderId, newStatus] = ctx.match;

    try {
      const adminAxios = createAdminAxios(ctx.from.id);
      const res = await adminAxios.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus
      });

      const updatedOrder = res.data.order;

      if (!updatedOrder) {
        return await ctx.reply("❌ Failed to fetch updated order data.");
      }

      try {
        await ctx.deleteMessage();
      } catch (err) {}

      await ctx.reply(
        `✅ Order ${orderId.slice(-8)} status updated to *${newStatus}*`,
        { parse_mode: "Markdown" }
      );

      // Notify customer
      try {
        if (updatedOrder.telegramId) {
          let userMessage = "";
          
          switch (newStatus) {
            case "SHIPPED":
              userMessage = `🚚 Your order #${orderId.slice(-8)} is on its way! 📦\n\nYou should receive it soon.`;
              break;
            case "DELIVERED":
              userMessage = `✅ Your order #${orderId.slice(-8)} has been delivered! 🎉\n\nThank you for shopping with Oohlala Fragrances!`;
              break;
            case "CANCELLED":
              userMessage = `❌ Your order #${orderId.slice(-8)} has been cancelled.\n\nIf you have any questions, please contact @t3hila.`;
              break;
            case "PROCESSING":
              userMessage = `⏳ Your order #${orderId.slice(-8)} is being processed.\n\nWe'll notify you once it ships!`;
              break;
          }
          
          if (userMessage) {
            await ctx.telegram.sendMessage(
              updatedOrder.telegramId,
              userMessage,
              { parse_mode: "Markdown" }
            );
          }
        }
      } catch (err) {
        console.error(`❌ Failed to notify user:`, err.message);
      }

    } catch (err) {
      console.error(err.response?.data || err.message);
      await ctx.reply("❌ Failed to update order status.");
    }
  });

  console.log("✅ All admin handlers registered successfully");
}

module.exports = { registerAdminHandlers, isAdmin };
