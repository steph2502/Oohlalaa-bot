const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegram_id: { type: String, required: true, unique: true },
  first_name: String,
  last_name: String,
  username: String,
  phone: String,
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
