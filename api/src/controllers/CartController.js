// controllers/CartController.js
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const crypto = require("crypto");
const { DELIVERY } = require("../config/constants");

/* =========================
   DELIVERY FEE LOGIC
========================= */
function computeDeliveryFee(location) {
  const defaultRate =
    DELIVERY.RATES.find(r => r.zone === "Default")?.fee || 0;

  if (!location) return defaultRate;

  const loc = location.toLowerCase();

  // Covenant University gets free delivery
  if (loc.includes(DELIVERY.COVENANT_KEYWORD.toLowerCase())) {
    return 0;
  }

  // Try to match a configured zone by name
  const matched = DELIVERY.RATES.find(r =>
    loc.includes(r.zone.toLowerCase())
  );

  return matched ? matched.fee : defaultRate;
}

/* =========================
   GET CART
========================= */
exports.getCart = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const cart = await Cart.findOne({ telegramId }).populate("items.product");

    if (!cart) {
      return res.json({
        items: [],
        total: 0,
        delivery_fee: 0,
        serviceFee: 0
      });
    }

    const subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const deliveryFee = computeDeliveryFee(cart.delivery_location);

    // Persist computed fee for consistency
    if (cart.delivery_fee !== deliveryFee) {
      cart.delivery_fee = deliveryFee;
      await cart.save();
    }

    const total = subtotal + deliveryFee;

    res.json({
      cart,
      subtotal,
      total,
      delivery_fee: deliveryFee,
      serviceFee: deliveryFee
    });
  } catch (err) {
    console.error("Get cart error:", err.message);
    res.status(500).json({ error: "Failed to get cart" });
  }
};

/* =========================
   SET DELIVERY LOCATION (ZONE ONLY)
========================= */
exports.setDeliveryLocation = async (req, res) => {
  try {
    const { telegramId, delivery_location } = req.body;

    if (!telegramId || !delivery_location) {
      return res
        .status(400)
        .json({ error: "telegramId and delivery_location are required" });
    }

    let cart = await Cart.findOne({ telegramId });

    if (!cart) {
      cart = new Cart({ telegramId, items: [], delivery_location });
    } else {
      cart.delivery_location = delivery_location;
    }

    cart.delivery_fee = computeDeliveryFee(delivery_location);

    await cart.save();

    res.json({ success: true, cart, delivery_fee: cart.delivery_fee });
  } catch (err) {
    console.error("Set delivery location error:", err.message);
    res.status(500).json({ error: "Failed to set delivery location" });
  }
};

/* =========================
   SET DELIVERY ADDRESS (NEW)
========================= */
exports.setDeliveryAddress = async (req, res) => {
  try {
    let { telegramId, delivery_location, delivery_address } = req.body;

    if (!telegramId || !delivery_address) {
      return res.status(400).json({ error: "Missing fields" });
    }

    telegramId = telegramId.toString(); // ensure string match

    const cart = await Cart.findOne({ telegramId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.delivery_location = delivery_location || cart.delivery_location;
    cart.delivery_address = delivery_address;
    cart.delivery_fee = computeDeliveryFee(cart.delivery_location);

    await cart.save();

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("Set delivery address error:", err.message);
    return res.status(500).json({ error: "Failed to set delivery address" });
  }
};


/* =========================
   ADD TO CART (RESERVE STOCK)
========================= */
exports.addToCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { telegramId, productId, size, quantity = 1 } = req.body;

    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error("Product not found");

    const sizeEntry = product.sizes.find(s => s.size === Number(size));
    if (!sizeEntry) throw new Error("Invalid size selected");

    let cart = await Cart.findOne({ telegramId }).session(session);
    if (!cart) {
      cart = new Cart({ telegramId, items: [], delivery_fee: 0 });
    }

    const existingItem = cart.items.find(
      i => i.product.toString() === productId && i.size === Number(size)
    );

    if (sizeEntry.stock < quantity) {
      throw new Error(`${product.name} (${size}ml) is out of stock`);
    }

    sizeEntry.stock -= quantity;
    await product.save({ session });

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        size: Number(size),
        quantity,
        price: sizeEntry.price
      });
    }

    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, cart });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Add to cart error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   UPDATE ITEM QUANTITY
========================= */
exports.updateQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { telegramId, productId, size, quantity } = req.body;

    const cart = await Cart.findOne({ telegramId }).session(session);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(
      i => i.product.toString() === productId && i.size === Number(size)
    );
    if (!item) return res.status(404).json({ error: "Item not found" });

    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error("Product not found");

    const sizeEntry = product.sizes.find(s => s.size === Number(size));
    if (!sizeEntry) throw new Error("Invalid size");

    const delta = quantity - item.quantity;

    if (delta > 0 && sizeEntry.stock < delta) {
      throw new Error("Not enough stock");
    }

    sizeEntry.stock -= delta;
    item.quantity = quantity;

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i !== item);
    }

    await product.save({ session });
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, cart });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update cart error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   REMOVE ITEM
========================= */
exports.removeItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { telegramId, productId, size } = req.body;

    const cart = await Cart.findOne({ telegramId }).session(session);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(
      i => i.product.toString() === productId && i.size === Number(size)
    );
    if (!item) return res.status(404).json({ error: "Item not found" });

    const product = await Product.findById(productId).session(session);
    const sizeEntry = product.sizes.find(s => s.size === Number(size));

    sizeEntry.stock += item.quantity;

    cart.items = cart.items.filter(
      i => !(i.product.toString() === productId && i.size === Number(size))
    );

    await product.save({ session });
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, cart });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Remove cart item error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   DEPRECATED CHECKOUT
========================= */
exports.checkoutCart = async (req, res) => {
  return res.status(410).json({
    error: "Deprecated endpoint. Use POST /orders/checkout instead."
  });
};
