require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { connectDatabase } = require('./config/database');

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();
    const app = createApp();
    const server = app.listen(port, () => {
      console.log(`HMS API listening on http://localhost:${port}`);
      console.log(`Health endpoint: http://localhost:${port}/health`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down HMS API...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`Failed to start HMS API: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
