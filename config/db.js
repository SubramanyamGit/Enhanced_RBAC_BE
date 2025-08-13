const mysql = require("mysql2/promise");

const connection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Root@123",
  database: "enhanced_rbac",
   waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

connection.connect;
(err) => {
  if (err) {
    return   console.log("Error:" + err.message);
  }
    console.log("Connected to the MySQL server.");
};

module.exports = connection;
