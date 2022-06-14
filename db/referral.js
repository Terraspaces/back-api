const mongoose = require("mongoose");
const referralModel = require("./model/referral");

const add = async (r) => {
  try {
    // Validate collection name against our drop table
    const referral = new referralModel({ ...{ approved: false }, ...r });
    await referral.save();
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

const exists = async ({
  collection_name,
  referred_wallet_id,
  referral_wallet_id,
}) => {
  try {
    // Validate collection name against our drop table
    const r = await referralModel.findOne({
      collection_name,
      referred_wallet_id,
      referral_wallet_id,
    });
    if (!r) return false;

    return true;
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

module.exports = { add, exists };
