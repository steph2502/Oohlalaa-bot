require("module-alias/register");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./api/src/config/db");

const userRoutes = require("./api/src/routes/UserRoutes");
const productRoutes = require("./api/src/routes/ProductRoutes");
const cartRoutes = require("./api/src/routes/CartRoutes");
const orderRoutes = require("./api/src/routes/OrderRoutes");
const adminRoutes = require("./api/src/routes/AdminRoutes");
const paymentRoutes = require("./api/src/routes/PaymentRoutes");

const app = express();

/* ==========================
   MIDDLEWARE
========================== */
app.use(cors());

// ✅ CRITICAL: Apply raw body capture ONLY to webhook routes
// This must come BEFORE the regular express.json() middleware
app.use(
  "/payment/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Regular JSON parsing for all other routes
app.use(express.json());

const PORT = process.env.API_PORT || 4000;

/* ==========================
   CONNECT DB & JOBS
========================== */
connectDB();

// 🔁 START BACKGROUND JOBS (AFTER DB CONNECT)
require("./api/src/jobs/cancelExpiredOrders");

/* ==========================
   ROUTES
========================== */

// Base route
app.get("/", (req, res) => res.send("Oohlala API running"));

// Health route
app.get("/health", (req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
);

// API routes
app.use("/user", userRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/payment", paymentRoutes);

// 🔐 Admin routes
app.use("/admin", adminRoutes);

// Internal placeholder
app.use("/_internal", (req, res) =>
  res.json({ msg: "internal placeholder" })
);

/* ==========================
   START SERVER
========================== */
app.listen(PORT, () =>
  console.log(`API running on port ${PORT}`)
);