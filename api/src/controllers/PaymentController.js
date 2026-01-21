// controllers/PaymentController.js
const crypto = require("crypto");
const Order = require("../models/Order");
const { notifyUser } = require("bot/src/utils/notifyUser.js");
const { notifyAdmin } = require("bot/src/utils/notifyAdmin.js"); // ✅ your admin notification utility

/* ==========================
   VERIFY KORAPAY SIGNATURE
========================= */
function verifyKorapaySignature(dataObject, signature) {
  const secret = process.env.KORAPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("❌ KORAPAY_WEBHOOK_SECRET is not set in .env");
    return false;
  }

  const dataString = JSON.stringify(dataObject);

  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataString)
    .digest("hex");

  return hash === signature;
}

/* ==========================
   KORAPAY WEBHOOK
========================= */
exports.paymentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-korapay-signature"];
    const { event, data } = req.body;

    if (!signature || !data) {
      return res.status(400).json({ error: "Invalid payload or missing signature" });
    }

    if (!verifyKorapaySignature(data, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (event !== "charge.success") {
      return res.status(200).json({ received: true });
    }

    const { reference, status } = data;
    const order = await Order.findOne({ paymentReference: reference });

    if (!order) {
      console.error(`❌ Order not found for reference: ${reference}`);
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(200).json({ received: true });
    }

    if (status === "success") {
      order.paymentStatus = "PAID";
      order.status = "PROCESSING";
      order.paidAt = new Date();
      order.paymentChannel = "KORAPAY";
      order.expiresAt = null;

      await order.save();

      // Notify user
      notifyUser(
        order.telegramId,
        `✅ *Payment Confirmed!*\n\n` +
        `🧾 Order ID: \`${order._id}\`\n` +
        `📦 Items:${order.items.map(i => `\n• ${i.productName} (${i.size}ml) x${i.quantity}`).join("")}\n` +
        `💰 Total: ₦${order.total}\n` +
        `🚚 Delivery: ${order.delivery_address}`
      );

      // ✅ Notify all admins
      notifyAdmin(order);

      return res.status(200).json({ success: true });
    }

    // Payment failed
    order.paymentStatus = "FAILED";
    order.status = "CANCELLED";
    order.expiresAt = null;
    await order.save();

    notifyUser(
      order.telegramId,
      `❌ *Payment Failed*\nYour order was cancelled. You can try again anytime.`
    );

    res.status(200).json({ success: false });

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
