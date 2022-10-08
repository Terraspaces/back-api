const mongoose = require("mongoose");
const { Schema } = mongoose;

const referralSchema = new mongoose.Schema(
  {
    referral_wallet_id: String,
    collection_name: String,
    referred_by: {
      type: String,
      enum: ["Terraspaces", "Staking Partners"],
    },
    approved: Boolean,
    rejected: Boolean,
    amount: Number,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const referralModel = mongoose.model("referral", referralSchema);

module.exports = referralModel;
