const mongoose = require("mongoose");
const referralModel = require("./model/referral");

const add = async (r) => {
  try {
    // Validate collection name against our drop table
    const referral = new referralModel({
      ...{ approved: false, amount: 0 },
      ...r,
    });
    const saved_referral = await referral.save();
    return saved_referral;
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
};

const exists = async ({
  collection_name,
  // referred_wallet_id,
  referral_wallet_id,
}) => {
  try {
    // Validate collection name against our drop table
    const r = await referralModel.findOne({
      collection_name,
      // referred_wallet_id,
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

const has_referral_on_last_24h = async (referral_wallet_id) => {
  try {
    const aggregation_pipeline = [
      {
        $match: {
          $and: [
            {
              referral_wallet_id: referral_wallet_id,
            },
            {
              $expr: {
                $lt: [
                  {
                    $dateDiff: {
                      startDate: "$created_at",
                      endDate: "$$NOW",
                      unit: "hour",
                    },
                  },
                  24,
                ],
              },
            },
          ],
        },
      },
      {
        $project: {
          referral_wallet_id: 1,
        },
      },
      {
        $group: {
          _id: "$referral_wallet_id",
          count: {
            $sum: 1,
          },
        },
      },
    ];

    const results = await referralModel.aggregate(aggregation_pipeline);
    if (!results || results.length <= 0) return false;

    const { count } = results[0];
    if (count <= 0) return false;

    return true;
  } catch (error) {
    console.error(`${has_referral_on_last_24h.name} error:`, error);
  }
  return true;
};

const get_stats = async (wallet_id) => {
  try {
    const aggregation_pipeline = [
      {
        $match: {
          referral_wallet_id: wallet_id,
        },
      },
      {
        $group: {
          _id: "$referral_wallet_id",
          submitted: {
            $sum: 1,
          },
          pending: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$approved", false] },
                    { $eq: ["$rejected", false] },
                  ],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
          approved: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$approved", true] },
                    { $eq: ["$rejected", false] },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
          amount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$approved", true] },
                    {
                      $or: [
                        { $eq: ["$rejected", false] },
                        { $exists: ["$rejected", false] },
                      ],
                    },
                  ],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
        },
      },
    ];
    const r = await referralModel.aggregate(aggregation_pipeline);
    if (!r || r.length <= 0)
      return {
        submitted: 0,
        approved: 0,
        amount: 0,
        pending: 0,
        _id: wallet_id,
      };

    return r[0];
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

module.exports = { add, exists, get_stats, has_referral_on_last_24h };
