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
      const { collection_name, referral_wallet_id } = req.body;

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

      // Check is a previous referral from last 24h
      const has_referral_on_last_24h =
        await referral_db.has_referral_on_last_24h(referral_wallet_id);

      if (has_referral_on_last_24h) {
        console.log(
          "a referral has already been done in last 24h, try again tomorrow",
          req.body
        );
        error(
          res,
          "a referral has already been done in last 24h, try again tomorrow",
          403
        );
        return;
      }

      const { _id } = await referral_db.add(req.body);

      const url = `${process.env.TRANSACTIONS_API}/referral/calculate/${_id}`;
      console.log("request url", url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": process.env.TRANSACTIONS_API_KEY,
        },
      });

      if (response.status != 200) {
        console.error(
          `error calculate ${JSON.stringify(await response.json())}`
        );
        error(res, "error calculate", 502);
        return;
      }
      res.send();
    } catch (error) {
      console.log(`${setEndpoints.name}: ${error}`);
    }
  });

  api.get("/referral/:wallet_id/stats/staking_partners", async (req, res) => {
    const { wallet_id } = req.params;
    const stats = await referral_db.get_stats(wallet_id, true);
    res.send(stats);
  });

  api.get("/referral/:wallet_id/stats/terraspaces", async (req, res) => {
    const { wallet_id } = req.params;

    const stats = await referral_db.get_stats(wallet_id, false);

    res.send(stats);
  });
};

module.exports = { setEndpoints };
