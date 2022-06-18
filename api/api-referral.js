const referral_db = require("../db/referral");
const drop_db = require("../db/drop");
const { error } = require("./helper/http");

const setEndpoints = (api) => {
  api.post("/referral", async (req, res) => {
    const { collection_name } = req.body;

    const drop_exists = await drop_db.exists(collection_name);
    if (!drop_exists) {
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

    await referral_db.add(req.body);
    res.send();
  });

  api.post("/referral/:wallet_id/stats", async (req, res) => {
    // const { collection_name } = req.body;
    const { wallet_id } = req.params;

    const stats = await referral_db.get_stats(wallet_id);

    res.send(stats);
  });
};

module.exports = { setEndpoints };
