// bot/src/utils/notifyAdmin.js
require("dotenv").config();
const { Telegraf } = require("telegraf");

// Initialize a bot instance only for sending admin notifications
// Make sure BOT_TOKEN is set in your .env
const bot = new Telegraf(process.env.BOT_TOKEN || "");

// Get admin IDs from .env (comma-separated)
const adminIds = (process.env.ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

/**
 * Notify all admins about a new paid order
 * @param {Object} order - The order object from MongoDB
 */
async function notifyAdmin(order) {
  if (!adminIds.length) {
    console.warn("⚠️ No admin IDs set in .env");
    return;
  }

  const message =
    `📦 *New Paid Order!*\n\n` +
    `Customer: ${order.customerName || order.telegramId}\n` +
    `Telegram ID: ${order.telegramId}\n` +
    `🧾 Order ID: \`${order._id}\`\n` +
    `📦 Items: ${order.items.map(i => `\n• ${i.productName} (${i.size}ml) x${i.quantity}`).join("")}\n` +
    `💰 Total: ₦${order.total}\n` +
    `🚚 Delivery: ${order.delivery_address}\n\n` +
    `Check the admin dashboard to process the order.`;

  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendMessage(adminId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`❌ Failed to notify admin ${adminId}:`, err.message);
    }
  }
}

module.exports = { notifyAdmin };
