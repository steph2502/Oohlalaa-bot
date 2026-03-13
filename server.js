require("module-alias/register");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./api/src/config/db");

// Route Imports
const userRoutes = require("./api/src/routes/UserRoutes");
const productRoutes = require("./api/src/routes/ProductRoutes");
const cartRoutes = require("./api/src/routes/CartRoutes");
const orderRoutes = require("./api/src/routes/OrderRoutes");
const adminRoutes = require("./api/src/routes/AdminRoutes");
const paymentRoutes = require("./api/src/routes/PaymentRoutes");

const app = express();
const PORT = process.env.PORT || 8080; // Changed default to 8080 to match Railway logs

/* ==========================
   1. MIDDLEWARE & WEBHOOKS
========================== */
app.use(cors());

// CRITICAL: Webhook Raw Body Capture (Must stay BEFORE general express.json)
app.post(
  "/payment/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  (req, res, next) => {
    next();
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================
   2. ROUTES (Defined before heavy startup)
========================== */
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Oohlala API running" });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.use("/user", userRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/admin", adminRoutes);

/* ==========================
   3. START SERVER FIRST 🚀
========================== */
// We listen IMMEDIATELY so Railway's health check passes.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is officially listening on port ${PORT}`);
  
  // 4. AFTER the server is up, connect DB and Bot
  startBackgroundServices();
});

/* ==========================
   4. BACKGROUND SERVICES
========================== */
async function startBackgroundServices() {
  try {
    // Connect to Database
    await connectDB();
    console.log("📦 MongoDB connected");

    // Start Telegram Bot
    if (process.env.BOT_TOKEN) {
      const { bot, setupCommands } = require("./bot/index");
      const { initCronJobs } = require("./api/src/jobs/cancelExpiredOrders");

      await setupCommands();
      bot.launch();
      console.log("🤖 Telegram Bot: ACTIVE");
      initCronJobs(bot);

      // Graceful stop
      process.once("SIGINT", () => bot.stop("SIGINT"));
      process.once("SIGTERM", () => bot.stop("SIGTERM"));
    }
  } catch (err) {
    console.error("❌ Startup Error during background services:", err);
  }
}
