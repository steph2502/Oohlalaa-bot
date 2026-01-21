require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");

const API = process.env.WORKER_API_URL || "http://localhost:4000";

cron.schedule("*/30 * * * *", async () => {
  console.log(new Date().toISOString(), "trigger: abandoned carts");
  try {
    await axios.get(`${API}/cron/abandoned-carts`);
  } catch (e) {
    console.error("Worker error:", e.message);
  }
});

cron.schedule("0 9 * * 1,3,5", async () => {
  console.log(new Date().toISOString(), "trigger: broadcast (M,W,F 9:00)");
  try {
    await axios.get(`${API}/cron/daily-broadcast`);
  } catch (e) {
    console.error("Worker broadcast error:", e.message);
  }
});

console.log("Worker started");
