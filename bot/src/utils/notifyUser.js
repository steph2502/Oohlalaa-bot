const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;

exports.notifyUser = async (telegramId, message) => {
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: telegramId,
        text: message,
        parse_mode: "Markdown"
      }
    );
  } catch (err) {
    console.error("Telegram notify error:", err.message);
  }
};
