const crypto = require("crypto");

exports.verifyKorapaySignature = (rawBody, signature) => {
  const secret = process.env.KORAPAY_WEBHOOK_SECRET;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
};
