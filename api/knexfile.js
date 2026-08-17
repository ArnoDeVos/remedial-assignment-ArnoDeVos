/**
 * Knex configuration.
 *
* Shared by the Knex CLI and the application so database connections and
 * migrations use the same validated environment configuration.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import environment from './src/config/environment.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('knex').Knex.Config} */
const configuration = {
  client: 'pg',
  connection: {
    host: environment.database.host,
    port: environment.database.port,
    user: environment.database.user,
    password: environment.database.password,
    database: environment.database.name,
  },
  pool: {
    min: environment.database.poolMin,
    max: environment.database.poolMax,
  },
  migrations: {
    directory: path.join(currentDirectory, 'src', 'database', 'migrations'),
    tableName: 'knex_migrations',
    extension: 'cjs',
    loadExtensions: ['.cjs'],
  },
  seeds: {
    directory: path.join(currentDirectory, 'src', 'database', 'seeds'),
    extension: 'cjs',
    loadExtensions: ['.cjs'],
  },
};

export default configuration;
