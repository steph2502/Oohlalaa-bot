const Product = require("../models/Product");

/**
 * Get all active products (order-friendly)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    const formatted = products.map(p => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      sizes: p.sizes
        .filter(s => s.stock > 0) // hide out-of-stock
        .map(s => ({
          size: s.size,
          price: s.price,
          stock: s.stock
        }))
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/**
 * Get products by category (order-friendly)
 */
exports.getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const allowedCategories = ["classic", "premium", "luxury"];

    if (!allowedCategories.includes(category.toLowerCase())) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const products = await Product.find({
      category: category.toLowerCase(),
      isActive: true,
    });

    const formatted = products.map(p => ({
      _id: p._id,
      name: p.name,
      sizes: p.sizes
        .filter(s => s.stock > 0)
        .map(s => ({
          size: s.size,
          price: s.price,
          stock: s.stock
        }))
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch category products" });
  }
};

/**
 * Get a single product + sizes (used when user selects product)
 */
exports.getProductForOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const sizes = product.sizes
      .filter(s => s.stock > 0)
      .map(s => ({
        size: s.size,
        price: s.price,
        stock: s.stock
      }));

    res.json({
      _id: product._id,
      name: product.name,
      category: product.category,
      sizes
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/**
 * ADMIN: Create product
 */
exports.createProduct = async (req, res) => {
  try {
    const { name, category, scent_family, description, sizes, isActive } = req.body;

    if (!name || !category || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        message: "Name, category, and sizes are required"
      });
    }

    const allowedCategories = ["classic", "premium", "luxury"];
    if (!allowedCategories.includes(category.toLowerCase())) {
      return res.status(400).json({ message: "Invalid category" });
    }

    for (let s of sizes) {
      if (
        s.size === undefined ||
        s.price === undefined ||
        s.stock === undefined
      ) {
        return res.status(400).json({
          message: "Each size must include size, price, and stock"
        });
      }
    }

    const product = await Product.create({
      name,
      category: category.toLowerCase(),
      scent_family,
      description,
      sizes,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * ADMIN: Update product stock
 */
exports.updateProductStock = async (req, res) => {
  try {
    const { size, stock } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const sizeEntry = product.sizes.find(s => s.size === Number(size));
    if (!sizeEntry) {
      return res.status(404).json({ error: "Size not found" });
    }
    
    sizeEntry.stock = Number(stock);
    await product.save();
    
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * ADMIN: Delete product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};