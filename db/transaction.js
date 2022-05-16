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
  const aggregation = [
    {
      $match: { name: account_id },
    },
    {
      $addFields: {
        last_statistic_length: { $size: "$statistics" },
      },
    },
    {
      $addFields: {
        statistics: {
          $map: {
            input: "$statistics",
            as: "stat",
            in: {
              total_items: "$$stat.total_items",
              total_listed: "$$stat.total_listed",
              total_owners: "$$stat.total_owners",
              total_volume: "$$stat.total_volume",
              floor_price: "$$stat.floor_price",
              floor_price_24: {
                $arrayElemAt: [
                  "$statistics.floor_price",
                  {
                    $cond: {
                      if: {
                        $lt: [
                          {
                            $subtract: [
                              "$last_statistic_length",
                              { $indexOfArray: ["$statistics", "$$stat"] },
                            ],
                          },
                          //"$last_statistic_length",
                          144,
                        ],
                      },
                      // then: { $subtract: ["$last_statistic_length", 1] },
                      then: {
                        $subtract: [
                          { $indexOfArray: ["$statistics", "$$stat"] },
                          1,
                        ],
                      },
                      else: 144 - 1,
                    },
                  },
                ],
              },
              floor_price_7: {
                $arrayElemAt: [
                  "$statistics.floor_price",
                  {
                    $cond: {
                      if: {
                        $lt: [
                          {
                            $subtract: [
                              "$last_statistic_length",
                              { $indexOfArray: ["$statistics", "$$stat"] },
                            ],
                          },
                          1008,
                        ],
                      },
                      then: {
                        $subtract: [
                          {
                            $subtract: [
                              "$last_statistic_length",
                              { $indexOfArray: ["$statistics", "$$stat"] },
                            ],
                          },
                          1,
                        ],
                      },
                      else: 1008 - 1,
                    },
                  },
                ],
              },
              day_volume: {
                $subtract: [
                  "$$stat.total_volume",
                  {
                    $arrayElemAt: [
                      "$statistics.total_volume",
                      {
                        $cond: {
                          if: {
                            $lt: [
                              {
                                $subtract: [
                                  "$last_statistic_length",
                                  { $indexOfArray: ["$statistics", "$$stat"] },
                                ],
                              },
                              144,
                            ],
                          },
                          then: "$last_statistic_length",
                          else: {
                            $add: [
                              { $indexOfArray: ["$statistics", "$$stat"] },
                              144,
                            ],
                          },
                        },
                      },
                    ],
                  },
                ],
              },

              instant_volume: {
                $subtract: [
                  "$$stat.total_volume",
                  {
                    $cond: {
                      if: {
                        $lt: [
                          {
                            $subtract: [
                              { $indexOfArray: ["$statistics", "$$stat"] },
                              1,
                            ],
                          },
                          0,
                        ],
                      },
                      then: { $indexOfArray: ["$statistics", "$$stat"] },
                      else: {
                        $subtract: [
                          { $indexOfArray: ["$statistics", "$$stat"] },
                          1,
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  ];
  const collectionsArray = await mongoose.connection
    .collection("collections")
    .aggregate(aggregation)
    .toArray();

  const { statistics } = collectionsArray[0];

  return statistics;
};

let near;
connect(config).then((result) => {
  near = result;
});

module.exports = {
  getTrendingCollectionData: getTrendingCollectionData,
  getTransactionsForCollection: getTransactionsForCollection,
};
