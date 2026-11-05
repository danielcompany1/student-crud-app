const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (pool) return pool;

  const requiredSettings = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingSettings = requiredSettings.filter((setting) => !process.env[setting]);
  if (missingSettings.length > 0) {
    const error = new Error(`Missing required database environment setting(s): ${missingSettings.join(', ')}.`);
    error.code = 'MISSING_DB_SETTINGS';
    throw error;
  }

  if (process.env.DB_PASSWORD === 'replace-with-your-own-long-random-password') {
    const error = new Error('DB_PASSWORD still contains the example placeholder.');
    error.code = 'INVALID_DB_SETTINGS';
    throw error;
  }

  if (!/^[A-Za-z0-9_]+$/.test(process.env.DB_NAME)) {
    const error = new Error('DB_NAME may contain only letters, numbers, and underscores.');
    error.code = 'INVALID_DB_SETTINGS';
    throw error;
  }

  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('DB_PORT must be a valid TCP port number.');
    error.code = 'INVALID_DB_SETTINGS';
    throw error;
  }

  // A pool reuses a small number of connections across API requests. Defer
  // creating it until a database operation so the web app can be imported by
  // serverless hosts before their database environment is configured.
  pool = mysql.createPool({
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

  return pool;
}

module.exports = {
  execute(...args) {
    return getPool().execute(...args);
  },
  getConnection(...args) {
    return getPool().getConnection(...args);
  },
  end(...args) {
    return pool ? pool.end(...args) : Promise.resolve();
  }
};
