const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in env");
    return;
  }
  try {
    await mongoose.connect(uri, {
      // options for mongoose 7.x are optional, but safe to include
      // useNewUrlParser: true, useUnifiedTopology: true
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connect error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
