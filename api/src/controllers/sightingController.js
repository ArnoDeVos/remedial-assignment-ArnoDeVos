/**
 * HTTP handlers for sighting routes.
 */

import asyncHandler from '../utils/asyncHandler.js';

/**
 * Builds the sighting route handlers.
 *
 * @param {import('../services/SightingService.js').default} sightingService
 *   Service containing the sighting business logic.
 * @returns {object} Express route handlers.
 */
export default function createSightingController(sightingService) {
  return {
    /**
     * POST /api/sightings
     */
    create: asyncHandler(async (request, response) => {
      const result = await sightingService.register(request.validated, request.resident);

      response.status(201).json({
        sighting: result.sighting,
        warnings: result.warnings,
      });
    }),

    /** GET /api/sightings — returns filtered map sightings. */
    list: asyncHandler(async (request, response) => {
      const sightings = await sightingService.list(request.validated);
      response.status(200).json({ sightings, count: sightings.length });
    }),

    /** GET /api/sightings/summary — returns an aggregate summary. */
    summary: asyncHandler(async (request, response) => {
      const summary = await sightingService.summarise(request.validated);
      response.status(200).json({ summary });
    }),

    /** GET /api/sightings/review-queue — returns unresolved sightings. */
    reviewQueue: asyncHandler(async (request, response) => {
      const sightings = await sightingService.listNeedingReview();
      response.status(200).json({ sightings, count: sightings.length });
    }),

    /** PATCH /api/sightings/:id/review — records a moderator decision. */
    review: asyncHandler(async (request, response) => {
      const sighting = await sightingService.review(
        request.params.id,
        request.validated,
        request.resident,
      );

      response.status(200).json({ sighting });
    }),
  };
}
