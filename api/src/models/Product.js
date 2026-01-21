const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema({
  size: { type: Number, required: true }, // e.g., 3ml, 10ml, 20ml
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 }
});

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String }, 
    category: {
      type: String,
      enum: ["classic", "premium", "luxury"],
      required: true
    },
    scent_family: {
      type: String,
      enum: ["oud", "fresh", "woody", "citrus", "fruity", "floral", "sweet", "vanilla", "musky", "spicy"]
    },
    sizes: [sizeSchema], 
    isActive: { type: Boolean, default: true } 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
