/**
 * Error handling middleware.
 *
 */

import { ApplicationError } from '../errors/ApplicationError.js';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Postgres error codes that map onto a meaningful HTTP status.
 */
const POSTGRES_STATUS_BY_CODE = Object.freeze({
  23505: { status: 409, message: 'That record already exists.' },
  23503: { status: 422, message: 'That record references something that does not exist.' },
  23502: { status: 422, message: 'A required field was missing.' },
});

/**
 * Catch-all for requests that matched no route.
 *
 * @param {import('express').Request} request Incoming request.
 * @param {import('express').Response} response Outgoing response.
 * @returns {void}
 */
export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      message: `No route matches ${request.method} ${request.originalUrl}.`,
    },
  });
}

/**
 * Converts any thrown value into a JSON error response.
 *
 * @param {Error} error The thrown error.
 * @param {import('express').Request} request Incoming request.
 * @param {import('express').Response} response Outgoing response.
 * @param {import('express').NextFunction} next Express continuation.
 * @returns {void}
 */
export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApplicationError) {
    logger.warn('Request failed', {
      method: request.method,
      path: request.originalUrl,
      status: error.statusCode,
      message: error.message,
    });

    response.status(error.statusCode).json({
      error: {
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  const postgres = POSTGRES_STATUS_BY_CODE[error.code];

  if (postgres) {
    logger.warn('Database constraint violated', {
      code: error.code,
      constraint: error.constraint,
      path: request.originalUrl,
    });

    response.status(postgres.status).json({ error: { message: postgres.message } });
    return;
  }

  // Anything reaching this point is a bug. 
  logger.error('Unhandled error', {
    method: request.method,
    path: request.originalUrl,
    message: error.message,
    stack: error.stack,
  });

  response.status(500).json({
    error: {
      message: 'Something went wrong while handling this request.',
      ...(environment.isProduction ? {} : { debug: error.message }),
    },
  });
}
