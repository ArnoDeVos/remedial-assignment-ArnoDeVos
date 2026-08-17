/**
 * Environment configuration
 *
 * Pattern: Singleton 
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads a required variable.
 *
 * @param {string} key Environment variable name.
 * @returns {string} Trimmed environment variable value.
 * @throws {Error} When the variable is missing or empty.
 */
function required(key) {
  const value = process.env[key];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        'Copy .env.template to .env and fill it in.',
    );
  }

  return value.trim();
}

/**
 *  Reads an optional environment variable.
 *
 * @param {string} key Name of the environment variable.
 * @param {string} fallback Value to use when the variable is absent.
 * @returns {string} The resolved value.
 */
function optional(key, fallback) {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

/**
 * Reads a variable that must be a positive integer.
 *
 * @param {string} key - Environment variable name.
 * @param {number} fallback - Value used when the variable is missing or empty.
 * @returns {number} Parsed positive integer.
 * @throws {Error} When the value is not a positive integer.
 */
function integer(key, fallback) {
  const raw = process.env[key];

  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable "${key}" must be a positive integer.`);
  }

  return parsed;
}

/**
 * Reads an environment variable as a boolean.
 *
 *  @param {string} key - Environment variable name.
 * @param {boolean} fallback - Value used when missing or empty.
 * @returns {boolean} Parsed boolean.
 */
function boolean(key, fallback) {
  const raw = process.env[key];

  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

const environment = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  port: integer('API_PORT', 4000),

  database: Object.freeze({
    host: optional('POSTGRES_HOST', 'localhost'),
    port: integer('POSTGRES_PORT', 5432),
    user: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
    name: required('POSTGRES_DB'),
    poolMin: integer('DATABASE_POOL_MIN', 2),
    poolMax: integer('DATABASE_POOL_MAX', 10),
  }),

  auth: Object.freeze({
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '12h'),
    bcryptRounds: integer('BCRYPT_ROUNDS', 10),
  }),

  boot: Object.freeze({
    runMigrations: boolean('RUN_MIGRATIONS_ON_BOOT', true),
    runSeeds: boolean('RUN_SEEDS_ON_BOOT', true),
  }),
});

export default environment;
