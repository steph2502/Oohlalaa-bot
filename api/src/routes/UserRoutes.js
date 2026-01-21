const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../controllers/userController");

router.post("/telegram-auth", telegramAuth);

module.exports = router;
