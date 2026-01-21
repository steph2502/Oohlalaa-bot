const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");

const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { DELIVERY } = require("../config/constants");

/* ==========================
   DELIVERY FEE CALCULATION
========================== */
function computeDeliveryFee(location) {
  const defaultRate =
    DELIVERY.RATES.find(r => r.zone === "Default")?.fee || 0;

  if (!location) return defaultRate;

  const loc = location.toLowerCase();

  if (loc.includes(DELIVERY.COVENANT_KEYWORD.toLowerCase())) {
    return 0;
  }

  const matched = DELIVERY.RATES.find(r =>
    loc.includes(r.zone.toLowerCase())
  );

  return matched ? matched.fee : defaultRate;
}

/* ==========================
   CHECKOUT CART
========================== */
exports.checkoutCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { telegramId, customerName } = req.body;
    if (!telegramId) throw new Error("telegramId is required");
    if (!customerName) throw new Error("customerName is required");

    /* ==========================
       FETCH CART
    ========================== */
    const cart = await Cart.findOne({ telegramId }).session(session);
    if (!cart || !cart.items.length) {
      throw new Error("Cart is empty");
    }

    let items = [];
    let subtotal = 0;

    /* ==========================
       BUILD ORDER ITEMS
    ========================== */
    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error("Product not found");

      const itemSize = Number(item.size);
      const sizeEntry = product.sizes.find(
        s => Number(s.size) === itemSize
      );

      if (!sizeEntry) {
        throw new Error(`${product.name} (${item.size}ml) not available`);
      }

      console.log(
        `Processing: ${product.name} (${item.size}ml) x${item.quantity}`
      );

      subtotal += sizeEntry.price * item.quantity;

      items.push({
        product: product._id,
        productName: product.name,
        size: sizeEntry.size,
        quantity: item.quantity,
        price: sizeEntry.price
      });
    }

    /* ==========================
       DELIVERY FEE
    ========================== */
    const delivery_fee = computeDeliveryFee(cart.delivery_location);
    cart.delivery_fee = delivery_fee;
    await cart.save({ session });

    const total = subtotal + delivery_fee;

    /* ==========================
       CREATE ORDER
    ========================== */
    const paymentReference = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const [order] = await Order.create(
      [
        {
          telegramId,
          customerName,
          items,
          subtotal,
          delivery_fee,
          total,
          delivery_location: cart.delivery_location,
          delivery_address: cart.delivery_address,
          paymentStatus: "UNPAID",
          paymentMethod: "KORAPAY",
          status: "PENDING",
          paymentReference,
          expiresAt
        }
      ],
      { session }
    );

    /* ==========================
       INIT KORAPAY PAYMENT
    ========================== */
    const korapayRes = await axios.post(
      "https://api.korapay.com/merchant/api/v1/charges/initialize",
      {
        amount: total,
        currency: "NGN",
        reference: paymentReference,
        redirect_url: process.env.KORAPAY_REDIRECT_URL,
        notification_url: process.env.KORAPAY_WEBHOOK_URL,
        narration: "Oohlalaa Fragrance Order",
        customer: {
          email: `${telegramId}@oohlalaa.shop`,
          name: customerName
        },
        metadata: {
          telegramId,
          orderId: order._id.toString()
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KORAPAY_WEBHOOK_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutUrl = korapayRes?.data?.data?.checkout_url;
    if (!checkoutUrl) {
      throw new Error("KoraPay checkout URL not returned");
    }

    order.paymentLink = checkoutUrl;
    await order.save({ session });

    /* ==========================
       CLEAR CART
    ========================== */
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ checkoutUrl });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("Checkout error:", err.message);
    res.status(400).json({ error: err.message });
  }
};
