const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

exports.sendTelegramMessage = async (chatId, text) => {
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }
    );
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
};
