const error = (res, error, status = 500) => {
  res.status(status).send({ message: error, code: status });
};

module.exports = { error };
