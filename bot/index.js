require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { initCronJobs } = require("../api/src/jobs/cancelExpiredOrders");
const { registerAdminHandlers } = require("./adminHandlers");

const bot = new Telegraf(process.env.BOT_TOKEN || "");

if (!process.env.BOT_TOKEN) {
  console.warn("⚠️ BOT_TOKEN not set. Bot will not start.");
}

// ==========================
// DEBUG MIDDLEWARE - ADD THIS FIRST
// ==========================
bot.use(async (ctx, next) => {
  if (ctx.message?.text) {
    console.log("📨 Update received:", {
      type: ctx.updateType,
      from: ctx.from.id,
      text: ctx.message.text,
      callback: undefined
    });
  }
  return next();
});

// ==========================
// USER STATE (FOR DELIVERY ADDRESS FLOW)
// ==========================
const userStates = {}; // Track delivery step per user

// ==========================
// HELPER: SAFE EDIT MESSAGE
// ==========================
async function safeEditMessage(ctx, text, markup = {}) {
  try {
    await ctx.editMessageText(text, markup);
  } catch (err) {
    if (err?.response?.description?.includes("message is not modified")) return;
    console.error("Edit error:", err.message);
  }
}

// ==========================
// MAIN MENU
// ==========================
function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🧴 Classic Perfume Oils", "cat_classic")],
    [Markup.button.callback("🌸 Premium Perfume Oils", "cat_premium")],
    [Markup.button.callback("✨ Luxury Perfume Oils", "cat_luxury")],
    [Markup.button.callback("📦 View Full Fragrance List", "full_list_0")],
    [Markup.button.callback("⏳ Out of Stock / Preorder", "view_preorder_0")],
    [Markup.button.callback("🛒 View Cart", "view_cart")],
    [Markup.button.callback("📞 Contact Support", "contact_support")]
  ]);
}

// ==========================
// REGISTER ADMIN HANDLERS EARLY
// ==========================
registerAdminHandlers(bot);
console.log("✅ Admin handlers registered");

// TEST COMMAND (remove this after testing)
bot.command("test", (ctx) => {
  console.log("🧪 Test command works!");
  ctx.reply("Test command received! User ID: " + ctx.from.id);
});

// ==========================
// START BOT
// ==========================
bot.start(async (ctx) => {
  console.log("🆔 /start from user:", ctx.from.id);
  const name = ctx.from.first_name || "there";
  await ctx.reply(
    `Hi ${name} 💛 Welcome to *Oohlala Fragrances!*\n\nWhat are we shopping for today?`,
    { parse_mode: "Markdown", ...mainMenu() }
  );
});

// ==========================
// CATEGORY → PRODUCTS
// ==========================
async function sendCategory(ctx, category, title) {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  try {
    const res = await axios.get(`${process.env.API_URL}/products/category/${category}`);
    const products = res.data;

    const buttons = products.map(p => {
      const inStock = p.sizes?.length > 0;
      return [
        Markup.button.callback(
          inStock ? p.name : `${p.name} (Preorder)`,
          inStock ? `product_${p._id}` : `preorder_${p._id}`
        )
      ];
    });
    buttons.push([Markup.button.callback("⬅️ Back", "back_to_menu")]);

    await safeEditMessage(
      ctx,
      `*${title}*\n\nSelect a fragrance:`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) }
    );
  } catch (err) {
    console.error(err.message);
    await ctx.reply("❌ Failed to load products.");
  }
}

bot.action("cat_classic", ctx => sendCategory(ctx, "classic", "🧴 Classic Perfume Oils"));
bot.action("cat_premium", ctx => sendCategory(ctx, "premium", "🌸 Premium Perfume Oils"));
bot.action("cat_luxury", ctx => sendCategory(ctx, "luxury", "✨ Luxury Perfume Oils"));

// ==========================
// FULL LIST (PAGINATED)
// ==========================
const PAGE_SIZE = 5;
bot.action(/^full_list_(\d+)$/, async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const page = Number(ctx.match[1]);
  try {
    const res = await axios.get(`${process.env.API_URL}/products`);
    const products = res.data;

    const totalPages = Math.ceil(products.length / PAGE_SIZE);
    const slice = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const buttons = slice.map(p => {
      const inStock = p.sizes?.length > 0;
      return [
        Markup.button.callback(
          inStock ? p.name : `${p.name} (Preorder)`,
          inStock ? `product_${p._id}` : `preorder_${p._id}`
        )
      ];
    });

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback("⬅️ Prev", `full_list_${page - 1}`));
    if (page < totalPages - 1) nav.push(Markup.button.callback("Next ➡️", `full_list_${page + 1}`));
    if (nav.length) buttons.push(nav);

    buttons.push([Markup.button.callback("⬅️ Back", "back_to_menu")]);

    await safeEditMessage(
      ctx,
      `📦 *All Fragrances* (Page ${page + 1}/${totalPages})`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) }
    );
  } catch (err) {
    console.error(err.message);
    await ctx.reply("❌ Failed to load full list.");
  }
});

// ==========================
// PRODUCT → SIZE SELECTION
// ==========================
bot.action(/^product_(.+)$/, async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const productId = ctx.match[1];
  try {
    const res = await axios.get(`${process.env.API_URL}/products/${productId}`);
    const product = res.data;

    if (!product.sizes || product.sizes.length === 0) {
      return ctx.reply("⚠️ This product is currently unavailable or on preorder.");
    }

    const buttons = product.sizes.map(s => [
      Markup.button.callback(`${s.size}ml — ₦${s.price}`, `add_${product._id}_${s.size}`)
    ]);
    buttons.push([Markup.button.callback("⬅️ Back", "continue_shopping")]);

    await safeEditMessage(
      ctx,
      `🧴 *${product.name}*\nSelect size:`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) }
    );
  } catch (err) {
    console.error(err.message);
    await ctx.reply("❌ Failed to load product.");
  }
});

// ==========================
// ADD TO CART
// ==========================
bot.action(/^add_(.+)_(.+)$/, async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const telegramId = ctx.from.id.toString();
  const [, productId, size] = ctx.match;
  try {
    await axios.post(`${process.env.API_URL}/cart/add`, {
      telegramId,
      productId,
      size: Number(size),
      quantity: 1
    });

    await ctx.reply("✅ Added to cart", {
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ Continue Shopping", "continue_shopping")],
        [Markup.button.callback("🛒 View Cart", "view_cart")]
      ])
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply("❌ Failed to add to cart.");
  }
});

// ==========================
// VIEW CART
// ==========================
async function viewCart(ctx) {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const telegramId = ctx.from.id.toString();

  try {
    const res = await axios.get(`${process.env.API_URL}/cart/${telegramId}`);
    const { cart, subtotal = 0, total = 0, serviceFee = 0 } = res.data;

    if (!cart || !cart.items?.length) {
      return safeEditMessage(ctx, "🛒 Your cart is empty.", {
        ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "back_to_menu")]])
      });
    }

    let message = "";
    const buttons = [];
    let hasPreorder = false;

    cart.items.forEach(item => {
      if (item.isPreorder) {
        hasPreorder = true;
        message += `${item.product.name} (${item.size}ml) - Preorder\nContact @t3hila to order\n\n`;
        buttons.push([Markup.button.callback(`📞 Contact ${item.product.name}`, "contact_support")]);
      } else {
        message += `${item.product.name}\nPrice: ₦${item.price}\nQty: ${item.quantity}\nTotal: ₦${item.price * item.quantity}\n\n`;
        buttons.push([Markup.button.callback(`🗑 Remove ${item.product.name} (${item.size}ml)`, `remove_${item.product._id}_${item.size}`)]);
      }
    });

    message += `*Subtotal:* ₦${subtotal}\n*Delivery Fee:* ₦${serviceFee}\n*Amount to pay:* ₦${total}\n`;

    const hasDeliveryLocation = !!cart.delivery_location;

    if (!hasDeliveryLocation) {
      buttons.push([Markup.button.callback("📍 Set Delivery Location", "set_delivery")]);
    } else if (!hasPreorder) {
      buttons.push([Markup.button.callback("📍 Change Delivery Location", "set_delivery")]);
      buttons.push([Markup.button.callback("💳 Proceed to Payment", "start_checkout")]);
    }

    buttons.push([Markup.button.callback("⬅️ Back", "back_to_menu")]);

    await safeEditMessage(ctx, message, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply("❌ Failed to load cart.");
  }
}

bot.action("view_cart", viewCart);
bot.command("view_cart", viewCart);

// ==========================
// DELIVERY LOCATION FLOW
// ==========================
async function handleDeliverySelection(ctx, label) {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const telegramId = ctx.from.id.toString();

  // set user state for address input
  userStates[telegramId] = { step: "ENTER_ADDRESS", delivery_location: label };

  await ctx.reply(
    `📍 *${label}*\n\nPlease type your *full delivery address*.\n\nExample:\nBlock D, Room 214`,
    { parse_mode: "Markdown" }
  );
}

bot.action("set_delivery", async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const buttons = [
    [Markup.button.callback("📍 Covenant University", "delivery_cu")],
    [Markup.button.callback("🚚 Lagos Mainland", "delivery_mainland")],
    [Markup.button.callback("🏙 Lagos Island", "delivery_island")],
    [Markup.button.callback("🌍 Other / Default", "delivery_other")],
    [Markup.button.callback("🚛 Interstate Delivery", "delivery_interstate")],
    [Markup.button.callback("⬅️ Back to Cart", "view_cart")]
  ];
  await safeEditMessage(ctx, "Where should we deliver your order?", { ...Markup.inlineKeyboard(buttons) });
});

bot.action("delivery_cu", (ctx) => handleDeliverySelection(ctx, "Covenant University"));
bot.action("delivery_mainland", (ctx) => handleDeliverySelection(ctx, "Lagos Mainland"));
bot.action("delivery_island", (ctx) => handleDeliverySelection(ctx, "Lagos Island"));
bot.action("delivery_other", (ctx) => handleDeliverySelection(ctx, "Other / Default"));

bot.action("delivery_interstate", async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  await safeEditMessage(ctx,
    "🚛 *Interstate Delivery*\n\nPlease contact @t3hila for pricing and details.",
    { parse_mode: "Markdown", ...Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Back", "set_delivery")],
      [Markup.button.callback("📞 Contact Support", "contact_support")]
    ]) }
  );
});

// ==========================
// ADDRESS INPUT + CONFIRM
// ==========================
bot.on("text", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const state = userStates[telegramId];
  
  // ONLY handle text if user is in address entry state
  if (!state || state.step !== "ENTER_ADDRESS") return;

  state.address = ctx.message.text.trim();
  state.step = "CONFIRM_ADDRESS";

  await ctx.reply(
    `📦 *Confirm Delivery Address*\n\n📍 ${state.delivery_location}\n${state.address}`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Confirm", "confirm_address")],
        [Markup.button.callback("✏️ Re-enter", "reenter_address")]
      ])
    }
  );
});

bot.action("reenter_address", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  if (userStates[telegramId]) userStates[telegramId].step = "ENTER_ADDRESS";
  await ctx.reply("✏️ Please re-enter your delivery address:");
});

bot.action("confirm_address", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const state = userStates[telegramId];
  if (!state || !state.address) return;

  try {
    await axios.post(`${process.env.API_URL}/cart/delivery-address`, {
      telegramId,
      delivery_location: state.delivery_location,
      delivery_address: state.address
    });

    delete userStates[telegramId];
    await ctx.reply("✅ Delivery address saved.");
    await viewCart(ctx);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply("❌ Failed to save delivery address.");
  }
});

// ==========================
// REMOVE ITEM
// ==========================
bot.action(/^remove_(.+)_(.+)$/, async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const telegramId = ctx.from.id.toString();
  const [, productId, size] = ctx.match;
  try {
    await axios.post(`${process.env.API_URL}/cart/remove`, { telegramId, productId, size: Number(size) });
    await viewCart(ctx);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply("❌ Failed to remove item.");
  }
});

// ==========================
// PREORDER
// ==========================
bot.action(/^preorder_(.+)$/, async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  await safeEditMessage(ctx, "📦 This item is on preorder. Contact @t3hila to order.", { ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "back_to_menu")]]) });
});

// ==========================
// CONTACT SUPPORT
// ==========================
bot.action("contact_support", async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  await safeEditMessage(ctx, "📞 Please contact @t3hila for support.", { ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "back_to_menu")]]) });
});

// ==========================
// NAVIGATION
// ==========================
bot.action("continue_shopping", async (ctx) =>
  safeEditMessage(ctx, "👇 Choose a category:", { ...mainMenu() })
);

bot.action("back_to_menu", async (ctx) =>
  safeEditMessage(ctx, "👇 What would you like to do?", { ...mainMenu() })
);

// ==========================
// CHECKOUT
// ==========================
bot.action("start_checkout", async (ctx) => {
  if (ctx.callbackQuery) await ctx.answerCbQuery();
  const telegramId = ctx.from.id.toString();
  const customerName = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim();

  // Get admin IDs from .env
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map(id => id.trim());

  // Check if the user has set a delivery address
  const cartRes = await axios.get(`${process.env.API_URL}/cart/${telegramId}`);
  const cart = cartRes.data.cart;

  if (!cart.delivery_address) {
    return ctx.reply("⚠️ Please set your delivery address before proceeding to payment.", {
      ...Markup.inlineKeyboard([[Markup.button.callback("📍 Set Delivery Address", "set_delivery")]])
    });
  }

  try {
    // Send checkout request to API
    const checkoutRes = await axios.post(`${process.env.API_URL}/orders/checkout`, {
      telegramId,
      customerName
    });
    const checkoutUrl = checkoutRes.data.checkoutUrl;

    // Reply to user
    await ctx.reply("💳 Here is your secure payment link:", {
      ...Markup.inlineKeyboard([[Markup.button.url("Pay Now", checkoutUrl)]])
    });

  
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply("❌ Failed to start checkout.");
  }
});


// ==========================
// PERSISTENT COMMANDS
// ==========================
async function setupCommands() {
  try {
    await bot.telegram.setMyCommands([
      { command: "start", description: "Start / display options" },
      
    ]);
    console.log("✅ Bot commands set");
  } catch (err) {
    console.warn("⚠️ Failed to set bot commands:", err.message);
  }
}

// ==========================
// LAUNCH BOT
// ==========================
setupCommands().finally(() => {
  bot.launch();
  console.log("🤖 Bot is running!");
  initCronJobs(bot);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));