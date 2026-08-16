/**
 * Database connection.
 *
 * Pattern: Singleton. Knex maintains its own connection pool, so this module
 * creates and owns the single Knex instance shared by the entire API.
 *
 */

import knexFactory from 'knex';

import configuration from '../../knexfile.js';
import logger from '../utils/logger.js';

const database = knexFactory(configuration);

/**
 * Waits until Postgres accepts queries.
 * @param {object} [options] Retry behaviour.
 * @param {number} [options.attempts=10] Maximum number of connection attempts.
 * @param {number} [options.delayMs=2000] Pause between attempts.
 * @returns {Promise<void>} Resolves once a trivial query succeeds.
 * @throws {Error} When every attempt failed.
 */
export async function waitForDatabase({ attempts = 10, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await database.raw('select 1');
      logger.info('Database connection established.');
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw new Error(
          `Could not connect to Postgres after ${attempts} attempts: ${error.message}`,
        );
      }

      logger.warn(
        `Database not ready (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms.`,
      );

      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
}

/**
 * Applies every migration that has not run yet.
 *
 * @returns {Promise<void>} Resolves when the schema is up to date.
 */
export async function runMigrations() {
  const [batch, applied] = await database.migrate.latest();

  if (applied.length === 0) {
    logger.info('Database schema already up to date.');
    return;
  }

  logger.info(`Applied ${applied.length} migration(s) in batch ${batch}.`);
}

/**
 *Runs database seeds when enabled.
 *
 * Seed files should be idempotent when executed automatically.
 *
 * @returns {Promise<void>} Resolves when seeding finished.
 */
export async function runSeeds() {
  await database.seed.run();
  logger.info('Seed files executed.');
}

/**
 * Gracefully destroys the Knex connection pool.
 *
 * @returns {Promise<void>} Resolves once every pooled connection is released.
 */
export async function closeDatabase() {
  await database.destroy();
  logger.info('Database connections closed.');
}

export default database;
