/**
 * Express application.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import createRouter from './routes/index.js';
import requestLogger from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Creates the configured Express application for the injected service container.
 *
 * @param {object} container container Application repositories and services.
 * @returns {import('express').Express} The configured Express application.
 */
export default function createApp(container) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '64kb' }));
  app.use(requestLogger);
  app.use('/api', createRouter(container));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
