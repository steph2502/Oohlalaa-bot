const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const { checkAdmin } = require("../controllers/AdminController");



const {
  createProduct,
  deleteProduct,
  updateProductStock
} = require("../controllers/ProductController");

const {
  addAdmin,
  getAdmins,
  removeAdmin,
  getStats,
  getOrders,
  getOrder,
  updateOrderStatus
} = require("../controllers/AdminController");

/* ==========================
   ADMIN MANAGEMENT
========================== */
router.post("/add", adminAuth, addAdmin);
router.get("/list", adminAuth, getAdmins);
router.delete("/:telegramId", adminAuth, removeAdmin);
router.post("/check", checkAdmin);


/* ==========================
   PRODUCT MANAGEMENT
========================== */
router.post("/products", adminAuth, createProduct);
router.delete("/products/:id", adminAuth, deleteProduct);
router.patch("/products/:id/stock", adminAuth, updateProductStock); // NEW

/* ==========================
   ORDER MANAGEMENT
========================== */
router.get("/orders", adminAuth, getOrders); // NEW - can filter with ?status=PROCESSING
router.get("/orders/:orderId", adminAuth, getOrder); // NEW
router.patch("/orders/:orderId/status", adminAuth, updateOrderStatus); // NEW

/* ==========================
   STATISTICS
========================== */
router.get("/stats", adminAuth, getStats); // NEW

module.exports = router;