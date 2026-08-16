/**
 * Process entry point.
 *
 * Boot sequence:
 *   1. wait for Postgres to accept connections
 *   2. apply migrations
 *   3. run seeds
 *   4. build the object graph and start listening
 */

import createApp from './app.js';
import createContainer from './container.js';
import environment from './config/environment.js';
import logger from './utils/logger.js';
import {
  closeDatabase,
  runMigrations,
  runSeeds,
  waitForDatabase,
} from './database/connection.js';

/**
 * Boots the API dependencies and starts its HTTP server.
 *
 * @returns {Promise<import('node:http').Server>} The listening HTTP server.
 */
async function start() {
  logger.info(`Starting Buurtwacht API in ${environment.nodeEnv} mode.`);

  await waitForDatabase();

  if (environment.boot.runMigrations) {
    await runMigrations();
  }

  if (environment.boot.runSeeds) {
    await runSeeds();
  }

  const container = createContainer();
  const app = createApp(container);

  const server = app.listen(environment.port, () => {
    logger.info(`API listening on port ${environment.port}.`);
  });

  registerShutdownHandlers(server);

  return server;
}

/**
 * Registers signal handlers that gracefully stop the HTTP server and database.
 *
 * @param {import('node:http').Server} server The running HTTP server.
 * @returns {void}
 */
function registerShutdownHandlers(server) {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down.`);

    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  logger.error('Failed to start the API', { message: error.message, stack: error.stack });
  process.exit(1);
});
