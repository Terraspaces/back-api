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
      $facet: {
        minMax: [
          {
            $match: { name: account_id },
          },
          {
            $project: {
              created_at: 0,
              updated_at: 0,
            },
          },
          {
            $addFields: {
              firstDate: { $min: "$statistics.created_at" },
            },
          },
          {
            $unwind: "$statistics",
          },
          {
            $addFields: {
              created_at_date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$statistics.created_at",
                },
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$statistics.created_at",
                },
              },
              list: {
                $push: "$$ROOT",
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $addFields: {
              min: {
                $first: {
                  $filter: {
                    input: "$list.statistics",
                    cond: {
                      $eq: [
                        "$$this.created_at",
                        { $min: "$list.statistics.created_at" },
                      ],
                    },
                  },
                },
              },
              max: {
                $first: {
                  $filter: {
                    input: "$list.statistics",
                    cond: {
                      $eq: [
                        "$$this.created_at",
                        { $max: "$list.statistics.created_at" },
                      ],
                    },
                  },
                },
              },
              minDate: { $min: "$list.statistics.created_at" },
              maxDate: { $max: "$list.statistics.created_at" },
              firstDate: { $max: "$list.firstDate" },
            },
          },
          {
            $project: {
              list: 0,
            },
          },
        ],
        list: [
          {
            $match: { name: account_id },
          },
          {
            $project: {
              created_at: 0,
              updated_at: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: "$list",
    },
    {
      $addFields: {
        statistics: {
          $map: {
            input: "$list.statistics",
            as: "stat",
            in: {
              total_items: "$$stat.total_items",
              total_listed: "$$stat.total_listed",
              total_owners: "$$stat.total_owners",
              total_volume: "$$stat.total_volume",
              floor_price: "$$stat.floor_price",
              floor_price: "$$stat.floor_price",
              created_at_date: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$$stat.created_at",
                    },
                  },
                  "",
                ],
              },
              floor_price_24: {
                $getField: {
                  field: "floor_price",
                  input: {
                    $arrayElemAt: [
                      "$list.statistics",
                      {
                        $indexOfArray: [
                          "$list.statistics.created_at",
                          {
                            $getField: {
                              field: "minDate",
                              input: {
                                $arrayElemAt: [
                                  "$minMax",
                                  {
                                    $indexOfArray: [
                                      "$minMax._id",
                                      {
                                        $dateToString: {
                                          format: "%Y-%m-%d",
                                          date: "$$stat.created_at",
                                        },
                                      },
                                    ],
                                  },
                                ],
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              floor_price_7: {
                $getField: {
                  field: "floor_price",
                  input: {
                    $getField: {
                      field: "min",
                      input: {
                        $max: {
                          $filter: {
                            input: "$minMax",
                            cond: {
                              $and: [
                                {
                                  $lte: [
                                    "$$this.minDate",
                                    {
                                      $cond: {
                                        if: {
                                          $lte: [
                                            {
                                              $dateSubtract: {
                                                startDate: "$$stat.created_at",
                                                unit: "week",
                                                amount: 1,
                                              },
                                            },
                                            {
                                              $getField: {
                                                field: "firstDate",
                                                input: {
                                                  $arrayElemAt: [
                                                    "$minMax",
                                                    {
                                                      $indexOfArray: [
                                                        "$minMax._id",
                                                        {
                                                          $dateToString: {
                                                            format: "%Y-%m-%d",
                                                            date: "$$stat.created_at",
                                                          },
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              },
                                            },
                                          ],
                                        },
                                        then: {
                                          $getField: {
                                            field: "firstDate",
                                            input: {
                                              $arrayElemAt: [
                                                "$minMax",
                                                {
                                                  $indexOfArray: [
                                                    "$minMax._id",
                                                    {
                                                      $dateToString: {
                                                        format: "%Y-%m-%d",
                                                        date: "$$stat.created_at",
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        else: {
                                          $dateSubtract: {
                                            startDate: "$$stat.created_at",
                                            unit: "week",
                                            amount: 1,
                                          },
                                        },
                                      },
                                    },
                                  ],
                                },

                                {
                                  $lte: [
                                    "$$this.maxDate",
                                    {
                                      $cond: {
                                        if: {
                                          $lt: [
                                            {
                                              $dateSubtract: {
                                                startDate: "$$stat.created_at",
                                                unit: "day",
                                                amount: 6,
                                              },
                                            },
                                            {
                                              $getField: {
                                                field: "firstDate",
                                                input: {
                                                  $arrayElemAt: [
                                                    "$minMax",
                                                    {
                                                      $indexOfArray: [
                                                        "$minMax._id",
                                                        {
                                                          $dateToString: {
                                                            format: "%Y-%m-%d",
                                                            date: "$$stat.created_at",
                                                          },
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              },
                                            },
                                          ],
                                        },
                                        then: {
                                          $getField: {
                                            field: "firstDate",
                                            input: {
                                              $arrayElemAt: [
                                                "$minMax",
                                                {
                                                  $indexOfArray: [
                                                    "$minMax._id",
                                                    {
                                                      $dateToString: {
                                                        format: "%Y-%m-%d",
                                                        date: "$$stat.created_at",
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        else: {
                                          $dateSubtract: {
                                            startDate: "$$stat.created_at",
                                            unit: "day",
                                            amount: 6,
                                          },
                                        },
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              day_volume: {
                $subtract: [
                  "$$stat.total_volume",
                  {
                    $getField: {
                      field: "total_volume",
                      input: {
                        $arrayElemAt: [
                          "$list.statistics",
                          {
                            $indexOfArray: [
                              "$list.statistics.created_at",
                              {
                                $getField: {
                                  field: "minDate",
                                  input: {
                                    $arrayElemAt: [
                                      "$minMax",
                                      {
                                        $indexOfArray: [
                                          "$minMax._id",
                                          {
                                            $dateToString: {
                                              format: "%Y-%m-%d",
                                              date: "$$stat.created_at",
                                            },
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                },
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
              instant_volume: {
                $subtract: [
                  "$$stat.total_volume",
                  {
                    $getField: {
                      field: "total_volume",
                      input: {
                        $arrayElemAt: [
                          "$list.statistics",
                          {
                            $cond: {
                              if: {
                                $lt: [
                                  {
                                    $indexOfArray: [
                                      "$list.statistics",
                                      "$$stat",
                                    ],
                                  },
                                  1,
                                ],
                              },
                              then: {
                                $indexOfArray: ["$list.statistics", "$$stat"],
                              },
                              else: {
                                $subtract: [
                                  {
                                    $indexOfArray: [
                                      "$list.statistics",
                                      "$$stat",
                                    ],
                                  },
                                  1,
                                ],
                              },
                            },
                          },
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
    {
      $project: { list: 0, minMax: 0 },
    },
  ];

  const collectionsArray = await mongoose.connection
    .collection("collections")
    .aggregate(aggregation, { allowDiskUse: true })
    .toArray();

  console.log("keys: ", Object.keys(collectionsArray[0]));
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
