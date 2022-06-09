const mongoose = require("mongoose");

const collection_name = "drops";
const getDrops = async ({ skip = 0, limit = 500 }) => {
  let dropsArray = [];
  try {
    const aggregation = [
      {
        $sort: {
          created_at: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    dropsArray = await mongoose.connection
      .collection(collection_name)
      .aggregate(aggregation, { allowDiskUse: true })
      .toArray();
  } catch (error) {
    console.error(`${like.name} error:`, error);
  }

  return dropsArray;
};

const getLikesByAccount = async ({ drop_name, account_id }) => {
  const results = await mongoose.connection
    .collection(collection_name)
    .find({ name: drop_name, likes: account_id })
    .toArray();
  return results;
};
const like = async ({ drop_name, account_id }) => {
  try {
    const results = await getLikesByAccount({ drop_name, account_id });
    if (results.length > 0) return;

    const updateResults = await mongoose.connection
      .collection(collection_name)
      .updateMany({ name: drop_name }, { $push: { likes: account_id } });

    console.log("updateResults: ", updateResults);
  } catch (error) {
    console.error(`${like.name} error:`, error);
  }

  return;
};

const unlike = async ({ drop_name, account_id }) => {
  try {
    const results = await getLikesByAccount({ drop_name, account_id });
    if (results.length <= 0) return;
    const updateResults = await mongoose.connection
      .collection(collection_name)
      .updateMany({ name: drop_name }, { $pull: { likes: account_id } });

    console.log("updateResults: ", updateResults);
  } catch (error) {
    console.error(`${unlike.name} error:`, error);
  }

  return;
};

module.exports = {
  getDrops,
  like,
  unlike,
};
