const path = require('node:path');
// Load configuration from this project even when Node is started elsewhere.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const pool = require('./src/config/database');
const studentsRouter = require('./src/routes/students');

const app = express();
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid TCP port number.');
}

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a little and try again.' }
  }
});

app.use('/api', apiLimiter);
app.use('/api/students', studentsRouter);
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'That API route does not exist.' }
  });
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'That page does not exist.' }
  });
});

// Keep internal error details in the server console; never send them to the browser.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'REQUEST_TOO_LARGE', message: 'The request body is too large.' }
    });
  }
  if (error instanceof SyntaxError && Object.hasOwn(error, 'body')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' }
    });
  }

  console.error('Unexpected request error:', error.code || error.name || 'UNKNOWN_ERROR');
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
  });
});

async function start() {
  let connection;
  try {
    connection = await pool.getConnection();
    connection.release();
  } catch (error) {
    if (connection) connection.release();
    console.error('Could not connect to MySQL. Check the local MySQL service, database, and app-user settings.', error.code || 'UNKNOWN_ERROR');
    await pool.end();
    process.exitCode = 1;
    return;
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Student CRUD app is running at http://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start();
