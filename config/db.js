const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

const connection = mysql.createPool({
  host: process.env.DB_URL,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

connection.connect;
(err) => {
  if (err) {
    console.log("ERRRO");

    return console.log("Error:" + err.message);
  }
  console.log("Connected to the MySQL server.");
};

module.exports = connection;
