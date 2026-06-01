const sql = require("mssql");
require("dotenv").config(); 

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  server: process.env.DB_SERVER || "",
  database: process.env.DB_DATABASE || "BMC",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("SQL Server Connected ✅");
    return pool;
  })
  .catch((err) => {
    console.log("SQL Server Error ❌:", err);
  });

module.exports = {
  sql,
  poolPromise,
};
