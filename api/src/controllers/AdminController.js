const mongoose = require("mongoose");
const axios = require("axios");
const Admin = require("../models/Admin");
const Order = require("../models/Order");
const Product = require("../models/Product");

/* ==========================
   CHECK IF TELEGRAM USER IS ADMIN
========================== */
async function isAdmin(telegramId) {
  try {
    const res = await axios.post(
      `${process.env.API_URL}/admin/check`,
      { telegramId: telegramId.toString() }
    );
    return res.data.isAdmin;
  } catch (err) {
    console.error("Admin check failed:", err.message);
    return false;
  }
}

/* ==========================
   CHECK IF USER IS ADMIN (API)
========================== */
exports.checkAdmin = async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId)
      return res.status(400).json({ error: "telegramId is required" });

    const admin = await Admin.findOne({
      telegramId: telegramId.toString()
    });

    res.json({ isAdmin: !!admin });
  } catch (err) {
    console.error("Check admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   ADD ADMIN
========================== */
exports.addAdmin = async (req, res) => {
  const { telegramId, fullName } = req.body;

  if (!telegramId || !fullName) {
    return res
      .status(400)
      .json({ error: "telegramId and fullName are required" });
  }

  try {
    const exists = await Admin.findOne({
      telegramId: telegramId.toString()
    });

    if (exists) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const admin = await Admin.create({
      telegramId: telegramId.toString(),
      fullName
    });

    res.json({ success: true, admin });
  } catch (err) {
    console.error("Add admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   GET ALL ADMINS
========================== */
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (err) {
    console.error("Get admins error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   REMOVE ADMIN
========================== */
exports.removeAdmin = async (req, res) => {
  try {
    const { telegramId } = req.params;
    if (!telegramId)
      return res.status(400).json({ error: "telegramId is required" });

    const deleted = await Admin.findOneAndDelete({
      telegramId: telegramId.toString()
    });

    if (!deleted)
      return res.status(404).json({ error: "Admin not found" });

    res.json({ success: true, message: "Admin removed" });
  } catch (err) {
    console.error("Remove admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   GET STATISTICS
========================== */
exports.getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const paidOrders = await Order.find({ paymentStatus: "PAID" });
    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const processingOrders = await Order.countDocuments({
      status: "PROCESSING"
    });
    const shippedOrders = await Order.countDocuments({
      status: "SHIPPED"
    });
    const deliveredOrders = await Order.countDocuments({
      status: "DELIVERED"
    });
    const cancelledOrders = await Order.countDocuments({
      status: "CANCELLED"
    });

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders
    });
  } catch (err) {
    console.error("Get stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

/* ==========================
   GET ORDERS
========================== */
exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status: status.toUpperCase() } : {};

    const orders = await Order.find(query)
      .populate("items.product") // ✅ ONLY CHANGE
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get orders error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   GET SINGLE ORDER
========================== */
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("items.product"); // ✅ ONLY CHANGE

    if (!order)
      return res.status(404).json({ error: "Order not found" });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Get order error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ==========================
   UPDATE ORDER STATUS
========================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status)
      return res.status(400).json({ error: "Status is required" });

    const order = await Order.findById(req.params.orderId);
    if (!order)
      return res.status(404).json({ error: "Order not found" });

    order.status = status.toUpperCase();
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error("Update order status error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
