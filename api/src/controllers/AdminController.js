const mongoose = require("mongoose");
const axios = require("axios");
const Admin = require("../models/Admin");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User"); // Add User model for stats

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
    const totalUsers = await User.countDocuments();
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
      totalUsers,
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
      .populate("items.product")
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
      .populate("items.product");

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

    const order = await Order.findById(req.params.orderId)
      .populate("items.product");
      
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

/* ==========================
   PRODUCT MANAGEMENT
========================== */

/* CREATE PRODUCT */
exports.createProduct = async (req, res) => {
  try {
    const { name, category, sizes, image, description } = req.body;

    // Validation
    if (!name || !category || !sizes || !Array.isArray(sizes)) {
      return res.status(400).json({ 
        error: "name, category, and sizes array are required" 
      });
    }

    // Validate sizes format
    for (const size of sizes) {
      if (!size.size || !size.price || size.stock === undefined) {
        return res.status(400).json({ 
          error: "Each size must have: size, price, and stock" 
        });
      }
    }

    const product = await Product.create({
      name,
      category: category.toLowerCase(),
      sizes,
      image: image || "",
      description: description || ""
    });

    res.status(201).json({ 
      success: true, 
      message: "Product created successfully",
      product 
    });
  } catch (err) {
    console.error("Create product error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE PRODUCT */
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ 
      success: true, 
      message: "Product updated successfully",
      product 
    });
  } catch (err) {
    console.error("Update product error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE PRODUCT STOCK */
exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, stock } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    if (!size || stock === undefined) {
      return res.status(400).json({ 
        error: "size and stock are required" 
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Find and update the specific size
    const sizeObj = product.sizes.find(s => s.size === parseInt(size));
    if (!sizeObj) {
      return res.status(404).json({ 
        error: `Size ${size}ml not found for this product` 
      });
    }

    sizeObj.stock = parseInt(stock);
    await product.save();

    res.json({ 
      success: true, 
      message: `Stock updated for ${size}ml to ${stock} units`,
      product 
    });
  } catch (err) {
    console.error("Update stock error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* DELETE PRODUCT */
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ 
      success: true, 
      message: "Product deleted successfully",
      deletedProduct: {
        id: product._id,
        name: product.name
      }
    });
  } catch (err) {
    console.error("Delete product error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* GET ALL PRODUCTS (Admin view with full details) */
exports.getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: products.length,
      products 
    });
  } catch (err) {
    console.error("Get products error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* GET SINGLE PRODUCT */
exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (err) {
    console.error("Get product error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
