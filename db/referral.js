const mongoose = require("mongoose");
const referralModel = require("./model/referral");

const add = async (r) => {
  try {
    const referral = new referralModel({ ...{ approved: false }, ...r });
    await referral.save();
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

module.exports = { add };
