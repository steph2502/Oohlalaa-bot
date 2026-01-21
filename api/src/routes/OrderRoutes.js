const router = require("express").Router();
const { checkoutCart } = require("../controllers/OrderController");

router.post("/checkout", checkoutCart);

module.exports = router;
