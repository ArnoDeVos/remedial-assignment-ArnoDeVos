/**
 * Stage 5 plausibility.
 *
 * Suspicious sightings remain stored for moderator review instead of being
 * rejected: they may be honest identification mistakes or useful evidence of a wider reporting pattern.
 *
 */

import { distanceInMetres, speedInMetresPerSecond, round } from '../../domain/neighbourhood.js';

/**
 * Fastest speed a plausible sighting may imply, in metres per second.
 * 12 m/s is about 43 km/h, comfortably faster than a sprinting cyclist and
 * far slower than a car.
 */
const MAXIMUM_PLAUSIBLE_SPEED_MPS = 12;

/**
 * Below this separation the speed figure is meaningless, because a few metres
 */
const MINIMUM_MEANINGFUL_DISTANCE_M = 25;

const plausibilityStage = {
  name: 'plausibility',

  /**
   * @param {object} context Shared pipeline context.
   * @returns {Promise<void>} Resolves once the sighting has been judged.
   */
  async process(context) {
    const previous = await context.sightingRepository.findPreviousSighting(
      context.subjectId,
      context.record.observed_at,
      context.transaction,
    );

    if (!previous) {
      return;
    }

    const metres = distanceInMetres(
      { x: previous.position_x, y: previous.position_y },
      { x: context.record.position_x, y: context.record.position_y },
    );

    const seconds =
      (context.record.observed_at.getTime() - new Date(previous.observed_at).getTime()) / 1000;

    if (metres < MINIMUM_MEANINGFUL_DISTANCE_M) {
      return;
    }

    const speed = speedInMetresPerSecond(metres, seconds);

    if (speed <= MAXIMUM_PLAUSIBLE_SPEED_MPS) {
      return;
    }

    const readableSpeed = Number.isFinite(speed) ? `${round(speed * 3.6, 1)} km/h` : 'instantly';

    context.status = 'needs_review';
    context.reviewReason =
      `Implausible movement: ${round(metres)} m in ${round(seconds)} s ` +
      `(${readableSpeed}) since the previous sighting of this subject.`;

    context.warnings.push({
      code: 'implausible_movement',
      message: context.reviewReason,
      previousSightingId: previous.id,
    });
  },
};

export default plausibilityStage;
