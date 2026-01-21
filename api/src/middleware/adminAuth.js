const Admin = require("../models/Admin");

module.exports = async (req, res, next) => {
  const telegramId = req.headers["x-telegram-id"];

  if (!telegramId) {
    return res.status(401).json({ message: "Missing admin identity" });
  }

  const admin = await Admin.findOne({ telegramId });

  if (!admin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};
