/**
 * Trajectory service.
 * Turns a list of sightings into a path
 */

import { distanceInMetres, speedInMetresPerSecond, round } from '../domain/neighbourhood.js';
import { presentSighting, presentSubject } from '../utils/presenters.js';

/** Speed above which a segment is drawn as uncertain. Matches the pipeline. */
const IMPLAUSIBLE_SPEED_MPS = 12;

/**
 * A gap longer than this splits the trajectory into a new leg.
 * Without it the last sighting of Monday evening would be joined to the first
 * of Tuesday morning by a straight line across the neighbourhood, implying a journey that never happened.
 */
const LEG_BREAK_SECONDS = 3 * 60 * 60;

export default class TrajectoryService {
  /**
   * @param {object} dependencies Injected collaborators.
   * @param {import('../repositories/SightingRepository.js').default} dependencies.sightingRepository
   *   Access to sightings.
   * @param {import('./SubjectService.js').default} dependencies.subjectService
   *   Used to resolve and present the subject.
   */
  constructor({ sightingRepository, subjectService }) {
    this.sightingRepository = sightingRepository;
    this.subjectService = subjectService;
  }

  /**
   * Builds the trajectory of one subject.
   *
   * @param {string} subjectId Subject UUID.
   * @param {object} [filters={}] Optional time window.
   * @param {Date} [filters.from] Earliest observation to include.
   * @param {Date} [filters.to] Latest observation to include.
   * @returns {Promise<object>} The subject, its sightings, the connecting
   *   segments and summary statistics.
   * @throws {import('../errors/ApplicationError.js').NotFoundError} When the
   *   subject does not exist.
   */
  async buildForSubject(subjectId, filters = {}) {
    const subject = await this.subjectService.requireById(subjectId);
    const sightings = await this.sightingRepository.findTimelineForSubject(subjectId, filters);

    const segments = TrajectoryService.buildSegments(sightings);

    return {
      subject: presentSubject(subject),
      sightings: sightings.map(presentSighting),
      segments,
      legs: TrajectoryService.countLegs(segments),
      statistics: TrajectoryService.summarise(sightings, segments),
    };
  }

  /**
   * Builds trajectories for several subjects at once.
   *
   * @param {Array<string>} subjectIds Subject UUIDs to include.
   * @param {object} [filters={}] Optional time window.
   * @returns {Promise<Array<{subjectId: string, points: Array<object>, segments: Array<object>}>>}
   *   One entry per subject that has at least two sightings in the window.
   */
  async buildForSubjects(subjectIds, filters = {}) {
    if (subjectIds.length === 0) {
      return [];
    }

    const sightings = await this.sightingRepository.findForMap({
      ...filters,
      limit: 2000,
    });

    const wanted = new Set(subjectIds);
    const bySubject = new Map();

    for (const sighting of sightings) {
      if (!wanted.has(sighting.subject_id)) {
        continue;
      }

      if (!bySubject.has(sighting.subject_id)) {
        bySubject.set(sighting.subject_id, []);
      }

      bySubject.get(sighting.subject_id).push(sighting);
    }

    return [...bySubject.entries()]
      .map(([subjectId, rows]) => {
        // findForMap returns newest first; a trajectory reads oldest first.
        const ordered = [...rows].sort(
          (left, right) => new Date(left.observed_at) - new Date(right.observed_at),
        );

        return {
          subjectId,
          subjectLabel: ordered[0].subject_label ?? null,
          subjectReferenceCode: ordered[0].subject_reference_code ?? null,
          points: ordered.map(presentSighting),
          segments: TrajectoryService.buildSegments(ordered),
        };
      })
      .filter((trajectory) => trajectory.points.length > 1);
  }

  /**
   * Connects consecutive sightings into annotated segments.
   *
   * @param {Array<object>} sightings Sighting rows, oldest first.
   * @returns {Array<object>} One segment per consecutive pair.
   */
  static buildSegments(sightings) {
    const segments = [];

    for (let index = 1; index < sightings.length; index += 1) {
      const previous = sightings[index - 1];
      const current = sightings[index];

      const from = { x: previous.position_x, y: previous.position_y };
      const to = { x: current.position_x, y: current.position_y };

      const metres = distanceInMetres(from, to);
      const seconds =
        (new Date(current.observed_at) - new Date(previous.observed_at)) / 1000;
      const speed = speedInMetresPerSecond(metres, seconds);

      segments.push({
        fromSightingId: previous.id,
        toSightingId: current.id,
        from,
        to,
        metres: round(metres),
        seconds: round(seconds),
        speedMetresPerSecond: Number.isFinite(speed) ? round(speed) : null,
        speedKilometresPerHour: Number.isFinite(speed) ? round(speed * 3.6, 1) : null,
        isImplausible: speed > IMPLAUSIBLE_SPEED_MPS,
        // A long pause is not a journey, so the client draws it as a break
        // rather than as a line.
        startsNewLeg: seconds > LEG_BREAK_SECONDS,
      });
    }

    return segments;
  }

  /**
   * Counts how many separate outings a trajectory contains.
   *
   * @param {Array<object>} segments Segments produced by {@link buildSegments}.
   * @returns {number} The number of legs; 1 for an unbroken path.
   */
  static countLegs(segments) {
    if (segments.length === 0) {
      return 0;
    }

    return segments.filter((segment) => segment.startsNewLeg).length + 1;
  }

  /**
   * Summarises a trajectory.
   *
   * @param {Array<object>} sightings The sightings the trajectory is built from.
   * @param {Array<object>} segments The connecting segments.
   * @returns {object} Totals and averages for the trajectory.
   */
  static summarise(sightings, segments) {
    const travelled = segments.filter((segment) => !segment.startsNewLeg);

    const totalMetres = travelled.reduce((total, segment) => total + segment.metres, 0);
    const totalSeconds = travelled.reduce((total, segment) => total + segment.seconds, 0);

    const zonesVisited = [
      ...new Set(sightings.map((sighting) => sighting.zone_code).filter(Boolean)),
    ];

    const reporters = new Set(sightings.map((sighting) => sighting.reporter_id));

    return {
      sightingCount: sightings.length,
      firstSeenAt: sightings.at(0)?.observed_at ?? null,
      lastSeenAt: sightings.at(-1)?.observed_at ?? null,
      totalMetres: round(totalMetres),
      totalSeconds: round(totalSeconds),
      averageSpeedMetresPerSecond:
        totalSeconds > 0 ? round(totalMetres / totalSeconds) : null,
      zonesVisited,
      distinctReporters: reporters.size,
      implausibleSegments: segments.filter((segment) => segment.isImplausible).length,
    };
  }
}
