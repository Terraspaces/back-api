const referralDb = require("../db/referral");

const setEndpoints = (api) => {
  api.post("/referral", async (req, res) => {
    await referralDb.add(req.body);
    res.send();
  });
};

module.exports = { setEndpoints };
