const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  productName: String,
  size: Number,
  quantity: Number,
  price: Number
});

const orderSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true
    },

    // ✅ ADD THIS (ONLY CHANGE)
    customerName: {
      type: String
    },

    items: [orderItemSchema],

    subtotal: {
      type: Number,
      required: true
    },

    /* ==========================
       DELIVERY
    ========================== */
    delivery_location: {
      type: String
    },

    delivery_address: {
      type: String
    },

    delivery_fee: {
      type: Number,
      default: 0
    },

    total: {
      type: Number,
      required: true
    },

    /* ==========================
       PAYMENT
    ========================== */
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "FAILED"],
      default: "UNPAID"
    },

    paymentReference: {
      type: String,
      required: true,
      unique: true
    },

    paymentMethod: {
      type: String,
      enum: ["KORAPAY", "TRANSFER"],
      default: "KORAPAY"
    },

    paymentLink: String,
    paymentChannel: String,
    paidAt: Date,

    /* ==========================
       ORDER STATUS
    ========================== */
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
      ],
      default: "PENDING"
    },

    expiresAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
