const mongoose = require("mongoose");
const { connect, keyStores } = require("near-api-js");

const connectionString = process.env.NEAR_DB_CONNECTION;

const homedir = require("os").homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = require("path").join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

const config = {
  keyStore,
  networkId: process.env.NETWORK_ID,
  nodeUrl: process.env.NODE_URL,
  headers: {},
};

const getObserveCollections = async () => {
  try {
    // get collections from contract
    const rawResult = await near.connection.provider.query({
      request_type: "call_function",
      account_id: CONTRACT_ACCOUNT_ID,
      method_name: "get_observe_ids",
      args_base64: btoa(`{}`),
      finality: "optimistic",
    });
    const results = JSON.parse(Buffer.from(rawResult.result).toString());

    const rawResult1 = await near.connection.provider.query({
      request_type: "call_function",
      account_id: CONTRACT_ACCOUNT_ID,
      method_name: "get_nft_contract_ids",
      args_base64: btoa(`{}`),
      finality: "optimistic",
    });
    const results1 = JSON.parse(Buffer.from(rawResult1.result).toString());

    for (let i = 0; i < results1.length; i++) {
      if (!results.includes(results1[i])) {
        results.push(results1[i]);
      }
    }

    return results;
  } catch (error) {
    console.log(error);
    return [];
  }
};

const CONTRACT_ACCOUNT_ID = "terraspaces-staking.near";

const getTrendingCollectionData = async () => {
  // const aggregation = [
  //   {
  //     $addFields: {
  //       last_statistic_length: { $size: "$statistics" },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       instant_volume: {
  //         $subtract: [
  //           {
  //             $arrayElemAt: [
  //               "$statistics.total_volume",
  //               { $subtract: ["$last_statistic_length", 1] },
  //             ],
  //           },
  //           {
  //             $arrayElemAt: [
  //               "$statistics.total_volume",
  //               { $subtract: ["$last_statistic_length", 2] },
  //             ],
  //           },
  //         ],
  //       },
  //       day_volume: {
  //         $subtract: [
  //           {
  //             $arrayElemAt: [
  //               "$statistics.total_volume",
  //               { $subtract: ["$last_statistic_length", 1] },
  //             ],
  //           },
  //           {
  //             $arrayElemAt: [
  //               "$statistics.total_volume",
  //               {
  //                 $cond: {
  //                   if: { $lt: ["$last_statistic_length", 144] },
  //                   then: { $subtract: ["$last_statistic_length", 1] },
  //                   else: 144 - 1,
  //                 },
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //       statistics_last_24h: {
  //         $arrayElemAt: [
  //           "$statistics.floor_price",
  //           {
  //             $cond: {
  //               if: { $lt: ["$last_statistic_length", 144] },
  //               then: { $subtract: ["$last_statistic_length", 1] },
  //               else: 144 - 1,
  //             },
  //           },
  //         ],
  //       },
  //       statistics_last_7days: {
  //         $arrayElemAt: [
  //           "$statistics.floor_price",
  //           {
  //             $cond: {
  //               if: { $lt: ["$last_statistic_length", 1008] },
  //               then: { $subtract: ["$last_statistic_length", 1] },
  //               else: 1008 - 1,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       floor_price_24: "$statistics_last_24h",
  //       floor_price_7: "$statistics_last_7days",
  //     },
  //   },
  //   {
  //     $project: {
  //       statistics: 0,
  //     },
  //   },
  // ];

  const aggregation = getTransactionsAggregation(null);
  const collectionsArray = await mongoose.connection
    .collection("collections")
    .aggregate(aggregation)
    .toArray();

  const trending_collections = {};
  for (const c of collectionsArray) {
    trending_collections[c.name] = c;
  }
  return trending_collections;
};

const getTransactionsForCollection = async (account_id) => {
  const aggregation = getTransactionsAggregation(account_id);
  const collectionsArray = await mongoose.connection
    .collection("collections")
    .aggregate(aggregation)
    .toArray();

  return collectionsArray;
};

const getTransactionsAggregation = (account_id) => {
  let aggregation = [];

  if (account_id !== undefined && account_id !== null) {
    aggregation.push({
      $match: {
        name: account_id,
      },
    });
  }

  aggregation = aggregation.concat([
    {
      $addFields: {
        last_statistic_length: { $size: "$statistics" },
      },
    },
    {
      $addFields: {
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
      },
    },
  ]);
  return aggregation;
};

let near;
connect(config).then((result) => {
  near = result;
});

module.exports = {
  getTrendingCollectionData: getTrendingCollectionData,
  getTransactionsForCollection: getTransactionsForCollection,
};
