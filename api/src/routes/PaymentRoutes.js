const express = require("express");
const router = express.Router();
const { paymentWebhook } = require("../controllers/PaymentController");

// Webhook URL the payment provider will call
router.post("/webhook", paymentWebhook);

module.exports = router;
