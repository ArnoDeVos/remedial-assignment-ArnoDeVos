/**
 * Neighbourhood controller.
 */

import asyncHandler from '../utils/asyncHandler.js';

/**
 * Builds the neighbourhood route handlers.
 *
 * @param {object} services Injected services.
 * @param {import('../services/NeighbourhoodService.js').default} services.neighbourhoodService
 *   Map and activity operations.
 * @param {import('../services/TrajectoryService.js').default} services.trajectoryService
 *   Trajectory reconstruction.
 * @returns {object} The neighbourhood route handlers.
 */
export default function createNeighbourhoodController({
  neighbourhoodService,
  trajectoryService,
}) {
  return {
    /** GET /api/neighbourhood/map */
    map: asyncHandler(async (request, response) => {
      const map = await neighbourhoodService.getMap();
      response.status(200).json({ map });
    }),

    /** GET /api/neighbourhood/activity */
    activity: asyncHandler(async (request, response) => {
      const activity = await neighbourhoodService.getActivity(request.validated);
      response.status(200).json({ activity });
    }),

    trajectories: asyncHandler(async (request, response) => {
      const subjectIds = String(request.query.subjectIds ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const trajectories = await trajectoryService.buildForSubjects(
        subjectIds,
        request.validated,
      );

      response.status(200).json({ trajectories, count: trajectories.length });
    }),
  };
}
