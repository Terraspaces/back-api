const mongoose = require("mongoose");
const { Schema } = mongoose;

const referralSchema = new mongoose.Schema(
  {
    referral_wallet_id: String,
    collection_name: String,
    referred_wallet_id: String,
    approved: Boolean,
    rejected: Boolean,
  },
  {
    timestamps: {
      createdAt: "created_at", // Use `created_at` to store the created date
      updatedAt: "updated_at", // and `updated_at` to store the last updated date
    },
  }
);

const referralModel = mongoose.model("referral", referralSchema);

module.exports = referralModel;
