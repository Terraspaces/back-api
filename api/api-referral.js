const referral_db = require("../db/referral");
const drop_db = require("../db/drop");
const transaction_db = require("../db/transaction");
const { error } = require("./helper/http");
const { json } = require("express/lib/response");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const setEndpoints = (api) => {
  api.post("/referral", async (req, res) => {
    try {
      const { collection_name } = req.body;

      const drop_exists = await drop_db.exists(collection_name);
      const collection_exists = await transaction_db.exists(collection_name);

      if (!drop_exists && !collection_exists) {
        console.log("collection_name", collection_name);
        error(res, "collection doesn't exists", 403);
        return;
      }

      const referral_exists = await referral_db.exists(req.body);
      if (referral_exists) {
        console.log("referral exists", req.body);
        error(res, "referral has already been done", 403);
        return;
      }

      const { _id } = await referral_db.add(req.body);

      const response = await fetch(
        `${process.env.TRANSACTIONS_API}/calculate/${_id}`,
        {
          method: "POST",
          headers: {
            "x-api-key": process.env.TRANSACTIONS_API_KEY,
          },
        }
      );
      if (!response.ok) {
        console.error(`error calculate ${response}`);
        error(res, "error calculate", 502);
        return;
      }
      res.send();
    } catch (error) {
      console.log(`${setEndpoints.name}: ${error}`);
    }
  });

  api.get("/referral/:wallet_id/stats", async (req, res) => {
    // const { collection_name } = req.body;
    const { wallet_id } = req.params;

    const stats = await referral_db.get_stats(wallet_id);

    res.send(stats);
  });
};

module.exports = { setEndpoints };
