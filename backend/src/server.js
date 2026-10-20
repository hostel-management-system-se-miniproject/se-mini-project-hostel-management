require('dotenv').config();
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').default;
const { createApp } = require('./app');
const { connectDatabase } = require('./config/database');
const { ensureIndexes } = require('./config/indexes');
const { getAuthConfig, assertAuthConfig } = require('./config/auth');
const { createLoginService } = require('./services/loginService');
const { createAccountStore } = require('./services/accountStore');

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    const authConfig = getAuthConfig();
    assertAuthConfig(authConfig);

    await connectDatabase();
    await ensureIndexes();

    const sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: Math.round(authConfig.sessionTimeoutMinutes * 60)
    });
    const loginService = createLoginService({ store: createAccountStore(), config: authConfig });
    const app = createApp({ authConfig, loginService, sessionStore });
    const server = app.listen(port, () => {
      console.log(`HMS API listening on http://localhost:${port}`);
      console.log(`Health endpoint: http://localhost:${port}/health`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down HMS API...`);
      server.close(async () => {
        await sessionStore.close();
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
