/**
 * Request logging middleware.
 *
 * @param {import('express').Request} request Incoming request.
 * @param {import('express').Response} response Outgoing response.
 * @param {import('express').NextFunction} next Express continuation.
 * @returns {void}
 */

import logger from '../utils/logger.js';

export default function requestLogger(request, response, next) {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info(
      `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs.toFixed(1)}ms`,
    );
  });

  next();
}
