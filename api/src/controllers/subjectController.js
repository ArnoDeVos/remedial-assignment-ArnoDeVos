/**
 * Subject controller.
 */

import asyncHandler from '../utils/asyncHandler.js';

/**
 * Builds the subject route handlers.
 *
 * @param {object} services Injected services.
 * @param {import('../services/SubjectService.js').default} services.subjectService
 *   Subject lookup operations.
 * @param {import('../services/TrajectoryService.js').default} services.trajectoryService
 *   Trajectory reconstruction.
 * @returns {object} The handlers.
 */
export default function createSubjectController({ subjectService, trajectoryService }) {
  return {
    /** GET /api/subjects */
    list: asyncHandler(async (request, response) => {
      const subjects = await subjectService.list(request.validated);
      response.status(200).json({ subjects, count: subjects.length });
    }),

    /** GET /api/subjects/:id */
    get: asyncHandler(async (request, response) => {
      const subject = await subjectService.getById(request.params.id);
      response.status(200).json({ subject });
    }),

    /** GET /api/subjects/:id/trajectory */
    trajectory: asyncHandler(async (request, response) => {
      const trajectory = await trajectoryService.buildForSubject(
        request.params.id,
        request.validated,
      );

      response.status(200).json({ trajectory });
    }),
  };
}
