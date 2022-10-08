const mongoose = require("mongoose");

const collection_name = "collections";
const getTrendingCollectionData = async () => {
  const aggregation = [
    {
      $addFields: {
        last_statistic_length: { $size: "$statistics" },
      },
    },
    {
      $addFields: {
        total_items: {
          $arrayElemAt: [
            "$statistics.total_items",
            { $subtract: ["$last_statistic_length", 1] },
          ],
        },
        total_listed: {
          $arrayElemAt: [
            "$statistics.total_listed",
            { $subtract: ["$last_statistic_length", 1] },
          ],
        },
        total_owners: {
          $arrayElemAt: [
            "$statistics.total_owners",
            { $subtract: ["$last_statistic_length", 1] },
          ],
        },
        total_volume: {
          $arrayElemAt: [
            "$statistics.total_volume",
            { $subtract: ["$last_statistic_length", 1] },
          ],
        },
        floor_price: {
          $arrayElemAt: [
            "$statistics.floor_price",
            { $subtract: ["$last_statistic_length", 1] },
          ],
        },
        instant_volume: {
          $subtract: [
            {
              $arrayElemAt: [
                "$statistics.total_volume",
                { $subtract: ["$last_statistic_length", 1] },
              ],
            },
            {
              $arrayElemAt: [
                "$statistics.total_volume",
                { $subtract: ["$last_statistic_length", 2] },
              ],
            },
          ],
        },
        day_volume: {
          $subtract: [
            {
              $arrayElemAt: [
                "$statistics.total_volume",
                { $subtract: ["$last_statistic_length", 1] },
              ],
            },
            {
              $arrayElemAt: [
                "$statistics.total_volume",
                {
                  $cond: {
                    if: { $lt: ["$last_statistic_length", 144] },
                    then: { $subtract: ["$last_statistic_length", 1] },
                    else: 144 - 1,
                  },
                },
              ],
            },
          ],
        },
        statistics_last_24h: {
          $arrayElemAt: [
            "$statistics.floor_price",
            {
              $cond: {
                if: { $lt: ["$last_statistic_length", 144] },
                then: { $subtract: ["$last_statistic_length", 1] },
                else: 144 - 1,
              },
            },
          ],
        },
        statistics_last_7days: {
          $arrayElemAt: [
            "$statistics.floor_price",
            {
              $cond: {
                if: { $lt: ["$last_statistic_length", 1008] },
                then: { $subtract: ["$last_statistic_length", 1] },
                else: 1008 - 1,
              },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        floor_price_24: "$statistics_last_24h",
        floor_price_7: "$statistics_last_7days",
      },
    },
    {
      $project: {
        statistics: 0,
        _id: 0,
        created_at: 0,
        updated_at: 0,
        statistics_last_24h: 0,
        statistics_last_7days: 0,
        last_statistic_length: 0,
      },
    },
  ];
  const collectionsArray = await mongoose.connection
    .collection(collection_name)
    .aggregate(aggregation)
    .toArray();

  const trending_collections = {};
  for (const c of collectionsArray) {
    trending_collections[c.name] = c;
  }
  return trending_collections;
};

const getTransactionsForCollection = async (account_id, skip, limit) => {
  const aggregation = [
    { $match: { name: account_id } },
    { $sort: { created_at: -1 } },
    { $limit: 1 },
    { $unwind: "$statistics" },
    { $sort: { "statistics.created_at": -1 } },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $addFields: {
        _id: "",
      },
    },
  ];

  const collectionsArray = await mongoose.connection
    .collection("tempstatistics")
    .aggregate(aggregation, { allowDiskUse: true })
    .toArray();

  return collectionsArray.map((c) => c.statistics);
};

const get_collections_name = async () => {
  let collectionsArray = [];
  try {
    const aggregation = [
      {
        $sort: {
          name: 1,
        },
      },
      {
        $project: {
          name: 1,
          _id: 0,
        },
      },
    ];

    collectionsArray = await mongoose.connection
      .collection(collection_name)
      .aggregate(aggregation, { allowDiskUse: true })
      .toArray();
  } catch (error) {
    console.error(`${like.name} error:`, error);
  }

  return collectionsArray;
};

const exists = async (collection) => {
  const results = await mongoose.connection
    .collection(collection_name)
    .find({ name: collection })
    .toArray();
  if (!results) return false;
  if (results.length <= 0) return false;
  return true;
};

module.exports = {
  getTrendingCollectionData,
  getTransactionsForCollection,
  get_collections_name,
  exists,
};
