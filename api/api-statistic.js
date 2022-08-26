const transactionDb = require("../db/transaction");

const setEndpoints = (api) => {
  api.post("/trending_collection_data", async (req, res) => {
    const results = await transactionDb.getTrendingCollectionData();
    res.send(results);
  });

  api.post("/statistic_data", async (req, res) => {
    let skip = 0;
    let limit = 1000;
    if (req.body.skip) {
      skip = parseInt(req.body.skip);
    }
    if (req.body.limit) {
      limit = parseInt(req.body.limit);
    }
    const results = await transactionDb.getTransactionsForCollection(
      req.body.account_id,
      skip,
      limit
    );
    res.send(results);
  });
};

module.exports = { setEndpoints };
