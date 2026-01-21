const axios = require("axios");

const PAYSTACK_BASE = process.env.PAYSTACK_BASE || "https://api.paystack.co";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "";

const paystack = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json"
  },
  timeout: 10000
});

module.exports = paystack;
