require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db/db");
const transaction = require("./db/transaction");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

var corsOptions = {
  // origin: "http://35.75.88.169:4000",
  origin: process.env.ORIGIN,
  optionsSuccessStatus: 200, // For legacy browser support
};
app.use(cors(corsOptions));

app.post("/trending_collection_data", async (req, res) => {
  const results = await transaction.getTrendingCollectionData();
  res.send(results);
});

app.post("/statistic_data", async (req, res) => {
  const results = await transaction.getTransactionsForCollection(
    req.body.account_id
  );
  res.send(results);
});

const port = process.env.PORT || 4002;

app.listen(port, async () => {
  console.log(`Server running on port ${port}, http://localhost:${port}`);
  await db.init();
});
