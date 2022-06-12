require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db/db");

const apiDrop = require("./api/api-drop");
const apiStatistic = require("./api/api-statistic");
const apiReferral = require("./api/api-referral");

const expressApi = express();
setMiddlewares();

apiStatistic.setEndpoints(expressApi);
apiDrop.setEndpoints(expressApi);
apiReferral.setEndpoints(expressApi);

start();

function setMiddlewares() {
  expressApi.use(express.urlencoded({ extended: false }));
  expressApi.use(express.json());

  expressApi.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "OPTIONS, GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    next();
  });

  const corsOptions = {
    // origin: "http://35.75.88.169:4000",
    origin: process.env.ORIGIN,
    optionsSuccessStatus: 200, // For legacy browser support
  };
  expressApi.use(cors(corsOptions));
}

function start(expressApi) {
  const port = process.env.PORT || 4002;

  expressApi.listen(port, async () => {
    console.log(`Server running on port ${port}, http://localhost:${port}`);
    await db.init();
  });
}
