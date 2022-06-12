const mongoose = require("mongoose");
const referralModel = require("./model/referral");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const transactionsApiEndpoint = process.env.TRANSACTIONS_API;

const add = async (r) => {
  try {
    const referral = new referralModel({ ...{ approved: false }, ...r });
    await referral.save();
  } catch (error) {
    console.error(`${add.name} error:`, error);
    throw new Error("could not add referral");
  }
  return;
};

const approve = async (is) => {
  try {
    await checkApprove();
    const url = `${transactionsApiEndpoint}/approve`;
    const dropResults = await fetch(url);
    const drops = await dropResults.json();

    await onApproveComplete(id);
  } catch (error) {
    throw error;
  }
};

async function checkApprove() {
  const r = await referralModel.findOne(
    { _id: id, approved: true },
    { _id: 1 }
  );
  if (r) {
    throw new Error("referral is already approved");
  }
  return;
}

const onApproveComplete = async (id) => {
  try {
    await referralModel.updateOne({ _id: id }, { approved: true });
  } catch (error) {
    console.error(`${approve.name} error:`, error);
    throw new Error("could not approve");
  }
  return;
};

module.exports = { add, approve };
