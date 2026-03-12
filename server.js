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
const PORT = process.env.PORT || 4000;

/* ==========================
   1. MIDDLEWARE & WEBHOOKS
========================== */
app.use(cors());

/**
 * ⚡ CRITICAL: Webhook Raw Body Capture
 * We handle this SPECIFICALLY before the global express.json() 
 * to ensure the stream isn't consumed before we grab the raw buffer.
 */
app.post(
  "/payment/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf; // Korapay/Stripe need this for signature verification
    },
  }),
  (req, res, next) => {
    // This passes the request into the paymentRoutes logic below
    next();
  }
);

// Regular JSON parsing for all other standard API routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================
   2. DATABASE & JOBS
========================== */
connectDB();
const { initCronJobs } = require("./api/src/jobs/cancelExpiredOrders");

/* ==========================
   3. TELEGRAM BOT (Non-Blocking)
========================== */
if (!process.env.BOT_TOKEN) {
  console.warn("⚠️ BOT_TOKEN not set. Bot will not start.");
} else {
  const { bot, setupCommands } = require("./bot/index");

  // We wrap this in an async block so it doesn't block the Express 'Listen'
  (async () => {
    try {
      await setupCommands();
      // Launching the bot starts long-polling, which is an infinite loop.
      // By keeping it here, Express can still finish its startup.
      bot.launch();
      console.log("🤖 Telegram Bot: ACTIVE (Long Polling)");
      initCronJobs(bot);
    } catch (err) {
      console.error("❌ Telegram Bot failed to start:", err);
    }
  })();

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

/* ==========================
   4. ROUTES
========================== */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Oohlala API running",
    version: "1.0.1",
    timestamp: new Date().toISOString(),
  });
});

// Railway Health Check Route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.use("/user", userRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/payment", paymentRoutes); // This will handle /payment/webhook
app.use("/admin", adminRoutes);

/* ==========================
   5. START SERVER
========================== */
// We bind to 0.0.0.0 specifically for Railway's networking layer
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is officially listening on port ${PORT}`);
});
