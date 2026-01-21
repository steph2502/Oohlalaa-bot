// POST /user/telegram-auth
const User = require("../models/User");

exports.telegramAuth = async (req, res) => {
  try {
    const { telegram_id, first_name, last_name, username, phone } = req.body;

    if (!telegram_id)
      return res.status(400).json({ error: "telegram_id is required" });

    let user = await User.findOne({ telegram_id });

    if (!user) {
      user = await User.create({
        telegram_id,
        first_name,
        last_name,
        username,
        phone
      });
    }

    res.json({ ok: true, user });

  } catch (err) {
    console.error("telegramAuth error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
