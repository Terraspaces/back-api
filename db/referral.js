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

const get_stats = async (wallet_id) => {
  try {
    const aggregation_pipeline = [
      {
        $match: {
          referred_wallet_id: wallet_id,
        },
      },
      {
        $group: {
          _id: "$referred_wallet_id",
          submitted: {
            $sum: 1,
          },
          approved: {
            $sum: {
              $cond: {
                if: { $eq: ["$approved", true] },
                then: 1,
                else: 0,
              },
            },
          },
          amount: {
            $sum: {
              $cond: {
                if: { $eq: ["$approved", true] },
                then: "$amount",
                else: 0,
              },
            },
          },
        },
      },
    ];
    const r = await referralModel.aggregate(aggregation_pipeline);
    if (!r || r.length <= 0) return { submitted: 0, approved: 0, amount: 0 _id: wallet_id};

    return r[0];
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

module.exports = { add, exists, get_stats };
