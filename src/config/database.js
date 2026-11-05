const mysql = require('mysql2/promise');

const requiredSettings = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingSettings = requiredSettings.filter((setting) => !process.env[setting]);
if (missingSettings.length > 0) {
  throw new Error(
    `Missing required environment setting(s): ${missingSettings.join(', ')}. ` +
    'Create .env from .env.example in the student-crud-app folder, then fill in its MySQL settings.'
  );
}

if (process.env.DB_PASSWORD === 'replace-with-your-own-long-random-password') {
  throw new Error('DB_PASSWORD still contains the example placeholder. Set it in .env to the password for your student_app MySQL account.');
}

if (!/^[A-Za-z0-9_]+$/.test(process.env.DB_NAME)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
}

const port = Number(process.env.DB_PORT || 3306);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid TCP port number.');
}

// A pool reuses a small number of database connections across API requests.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: 'Z',
  charset: 'utf8mb4'
});

module.exports = pool;
