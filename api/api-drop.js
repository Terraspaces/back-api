const dropDb = require("../db/drop");

const getQueryParams = () => {
  let skip = 0,
    limit = 0;
  if (Object.keys(req.query).includes("skip")) {
    skip = req.query.skip;
  }
  if (Object.keys(req.query).includes("limit")) {
    limit = req.query.limit;
  }
  return { skip, limit };
};

const setEndpoints = (api) => {
  api.get("/drops", async (req, res) => {
    let { skip, limit } = getQueryParams();
    const drops = await dropDb.getDrops({
      skip,
      limit,
    });
    res.send(drops);
  });

  api.post("/drops/like", async (req, res) => {
    const { drop_name, account_id } = req.body;
    await dropDb.like({
      drop_name,
      account_id,
    });
    res.send();
  });
  api.post("/drops/unlike", async (req, res) => {
    const { drop_name, account_id } = req.body;
    await dropDb.unlike({
      drop_name,
      account_id,
    });
    res.send();
  });
};

module.exports = { setEndpoints };
