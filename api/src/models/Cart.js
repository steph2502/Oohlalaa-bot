const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      index: true,
    },

    delivery_location: {
      type: String,
    },

    /* ==========================
       DELIVERY ADDRESS (NEW)
    ========================== */
    delivery_address: {
      type: String,
      default: null
    },

    delivery_fee: {
      type: Number,
      default: 0,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],

    isAbandoned: {
      type: Boolean,
      default: false,
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for abandoned cart queries
CartSchema.index({ updatedAt: 1, reminderSent: 1 });

module.exports = mongoose.model("Cart", CartSchema);
