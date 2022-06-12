const referralDb = require("../db/referral");

const setEndpoints = (api) => {
  api.post("/referral", async (req, res) => {
    await referralDb.add(req.body);
    res.send();
  });
  api.post("/referral/:id/approve", async (req, res) => {
    const { id } = req.params;
    await referralDb.approve(id);
    res.send();
  });
};

module.exports = { setEndpoints };
