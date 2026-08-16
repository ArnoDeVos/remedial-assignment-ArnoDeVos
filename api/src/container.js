/**
 * Application composition root.
 * Repository and service construction is centralised here so implementations can be replaced without changing application code.
 */

import NeighbourhoodRepository from './repositories/NeighbourhoodRepository.js';
import ResidentRepository from './repositories/ResidentRepository.js';
import SightingRepository from './repositories/SightingRepository.js';
import SubjectRepository from './repositories/SubjectRepository.js';

import AuthService from './services/AuthService.js';
import NeighbourhoodService from './services/NeighbourhoodService.js';
import SightingService from './services/SightingService.js';
import SubjectService from './services/SubjectService.js';
import TrajectoryService from './services/TrajectoryService.js';

import { createSightingPipeline } from './validation/stages/index.js';

/**
 * Creates the application's object graph.
 *
 * @param {import('knex').Knex} [connection] KOptional Knex connection. When
 * omitted, repositories use their shared default connection.
 * @returns {object} Every repository and service, ready to use.
 */
export function createContainer(connection) {
  const residentRepository = new ResidentRepository(connection);
  const subjectRepository = new SubjectRepository(connection);
  const sightingRepository = new SightingRepository(connection);
  const neighbourhoodRepository = new NeighbourhoodRepository(connection);

  const subjectService = new SubjectService({ subjectRepository });

  const authService = new AuthService({
    residentRepository,
    neighbourhoodRepository,
  });

  const sightingService = new SightingService({
    sightingRepository,
    subjectRepository,
    subjectService,
    cleaningPipeline: createSightingPipeline(),
  });

  const trajectoryService = new TrajectoryService({
    sightingRepository,
    subjectService,
  });

  const neighbourhoodService = new NeighbourhoodService({
    neighbourhoodRepository,
    sightingRepository,
    residentRepository,
  });

  return {
    repositories: {
      residentRepository,
      subjectRepository,
      sightingRepository,
      neighbourhoodRepository,
    },
    services: {
      authService,
      subjectService,
      sightingService,
      trajectoryService,
      neighbourhoodService,
    },
  };
}

export default createContainer;
