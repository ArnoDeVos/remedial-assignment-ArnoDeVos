/**
 * Minimal structured logger.
 * 
 *  Centralizes log levels and output formatting without external dependencies.
 */

/** Numeric severities used to filter log messages. */
const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

/** added width of the widest level name, so the level column stays aligned. */
const LEVEL_COLUMN_WIDTH = 5;

const activeLevel = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

/**
 * Writes a log entry when its severity meets the active log level.
 *
 * @param {'debug'|'info'|'warn'|'error'} level Log severity.
 * @param {string} message Human-readable message.
 * @param {object} [context] Optional structured context.
 * @returns {void}
 */
function write(level, message, context) {
  if (LEVELS[level] < activeLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const suffix = context === undefined ? '' : ` ${JSON.stringify(context)}`;
  const line = `[${timestamp}] ${level.toUpperCase().padEnd(LEVEL_COLUMN_WIDTH)} ${message}${suffix}\n`;

  // Errors go to stderr so Docker and CI can separate failures from output.
  if (level === 'error') {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

const logger = {
  /**
   * @param {string} message Message to log.
   * @param {object} [context] Structured detail.
   * @returns {void}
   */
  debug(message, context) {
    write('debug', message, context);
  },

  /**
   * @param {string} message Message to log.
   * @param {object} [context] Structured detail.
   * @returns {void}
   */
  info(message, context) {
    write('info', message, context);
  },

  /**
   * @param {string} message Message to log.
   * @param {object} [context] Structured detail.
   * @returns {void}
   */
  warn(message, context) {
    write('warn', message, context);
  },

  /**
   * @param {string} message Message to log.
   * @param {object} [context] Structured detail.
   * @returns {void}
   */
  error(message, context) {
    write('error', message, context);
  },
};

export default logger;
