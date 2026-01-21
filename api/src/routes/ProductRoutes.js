const router = require("express").Router();
const {
  getAllProducts,
  getByCategory,
  getProductForOrder,
  createProduct,
  deleteProduct
} = require("../controllers/ProductController");
const adminAuth = require("../middleware/adminAuth");

// User routes
router.get("/", getAllProducts);
router.get("/category/:category", getByCategory);
router.get("/:id", getProductForOrder);

// Admin routes (protected)
router.post("/", adminAuth, createProduct);
router.delete("/:id", adminAuth, deleteProduct);

module.exports = router;
