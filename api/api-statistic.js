const transactionDb = require("../db/transaction");

const setEndpoints = (api) => {
  api.post("/trending_collection_data", async (req, res) => {
    const results = await transactionDb.getTrendingCollectionData();
    res.send(results);
  });

  api.post("/statistic_data", async (req, res) => {
    const results = await transactionDb.getTransactionsForCollection(
      req.body.account_id
    );
    res.send(results);
  });
};

module.exports = { setEndpoints };
