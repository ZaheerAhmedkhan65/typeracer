const mysql = require('mysql2');
require('dotenv').config();

// Create connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  port: process.env.DATABASE_PORT,
  ssl: {
    rejectUnauthorized: true // Enforces secure connection
  }
});

// Connect
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL securely!");
});

module.exports = db;
