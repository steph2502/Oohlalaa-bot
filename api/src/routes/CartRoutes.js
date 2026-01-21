// routes/CartRoutes.js
const express = require("express");
const router = express.Router();
const CartController = require("../controllers/CartController");

// Get cart
router.get("/:telegramId", CartController.getCart);

// Add item to cart
router.post("/add", CartController.addToCart);

// Set delivery location (zone only)
router.post("/delivery", CartController.setDeliveryLocation);

// ✅ NEW: Set delivery address (zone + full address)
router.post("/delivery-address", CartController.setDeliveryAddress);

// Update item quantity
router.post("/update", CartController.updateQuantity);

// Remove item
router.post("/remove", CartController.removeItem);

// Deprecated checkout
router.post("/checkout", CartController.checkoutCart);

module.exports = router;
