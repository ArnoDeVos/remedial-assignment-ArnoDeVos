/**
 * Complete API route table.
 * The application mounts this router at `/api`.
 */

import { Router } from 'express';

import createAuthController from '../controllers/authController.js';
import createNeighbourhoodController from '../controllers/neighbourhoodController.js';
import createSightingController from '../controllers/sightingController.js';
import createSubjectController from '../controllers/subjectController.js';

import validateRequest from '../middleware/validateRequest.js';
import { requireAuthentication, requireRole } from '../middleware/authenticate.js';

import { loginSchema, registerSchema } from '../validation/schemas/authSchemas.js';
import {
  createSightingSchema,
  listSightingsSchema,
  listSubjectsSchema,
  reviewSightingSchema,
  timeWindowSchema,
} from '../validation/schemas/sightingSchemas.js';

/**
 * Creates the Express API router from the application's injected services.
 *
 * @param {object} container Application dependency container.
 * @returns {import('express').Router} Configured Express router
 */
export default function createRouter(container) {
  const { services } = container;
  const router = Router();

  const authenticate = requireAuthentication(services.authService);

  const authController = createAuthController(services.authService);
  const sightingController = createSightingController(services.sightingService);
  const subjectController = createSubjectController(services);
  const neighbourhoodController = createNeighbourhoodController(services);

  // Health
  router.get('/health', (request, response) => {
    response.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  //Authentication
  router.post('/auth/register', validateRequest(registerSchema), authController.register);
  router.post('/auth/login', validateRequest(loginSchema), authController.login);
  router.get('/auth/me', authenticate, authController.me);

  // Neighbourhood
  // Public: anyone can look at the map, which is the point of the project.
  router.get('/neighbourhood/map', neighbourhoodController.map);
  router.get(
    '/neighbourhood/activity',
    validateRequest(timeWindowSchema, 'query'),
    neighbourhoodController.activity,
  );
  router.get(
    '/neighbourhood/trajectories',
    validateRequest(timeWindowSchema, 'query'),
    neighbourhoodController.trajectories,
  );

  // Subjects
  router.get('/subjects', validateRequest(listSubjectsSchema, 'query'), subjectController.list);
  router.get('/subjects/:id', subjectController.get);
  router.get(
    '/subjects/:id/trajectory',
    validateRequest(timeWindowSchema, 'query'),
    subjectController.trajectory,
  );

  // Sightings
  // Reading is public; writing needs an account, so every row can be traced to exactly one resident.
  router.get('/sightings', validateRequest(listSightingsSchema, 'query'), sightingController.list);
  router.get(
    '/sightings/summary',
    validateRequest(timeWindowSchema, 'query'),
    sightingController.summary,
  );
  router.post(
    '/sightings',
    authenticate,
    validateRequest(createSightingSchema),
    sightingController.create,
  );

  // Moderation
  router.get(
    '/sightings/review-queue',
    authenticate,
    requireRole('moderator'),
    sightingController.reviewQueue,
  );
  router.patch(
    '/sightings/:id/review',
    authenticate,
    requireRole('moderator'),
    validateRequest(reviewSightingSchema),
    sightingController.review,
  );

  return router;
}
