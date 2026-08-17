/**
 * Stage 2 — temporal checks.
 */

import { ValidationError } from '../../errors/ApplicationError.js';

/** How far ahead of the server a client's clock may be. */
const CLOCK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;

/** Sightings older than this are refused; the map only shows recent history. */
const MAXIMUM_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Sightings reported this long after the fact are flagged as less reliable. */
const LATE_REPORT_THRESHOLD_MS = 48 * 60 * 60 * 1000;

const temporalStage = {
  name: 'temporal',

  /**
   * @param {object} context Shared pipeline context.
   * @returns {void}
   */
  process(context) {
    const observedAt = context.input.observedAt;
    const now = context.now ?? new Date();

    if (Number.isNaN(observedAt.getTime())) {
      throw new ValidationError('The observation time could not be read.', {
        observedAt: 'Use an ISO 8601 date and time.',
      });
    }

    if (observedAt.getTime() > now.getTime() + CLOCK_SKEW_TOLERANCE_MS) {
      throw new ValidationError('A sighting cannot be in the future.', {
        observedAt: 'Pick a moment that has already happened.',
      });
    }

    if (now.getTime() - observedAt.getTime() > MAXIMUM_AGE_MS) {
      throw new ValidationError('That sighting is too old to add.', {
        observedAt: 'Sightings can be registered up to 30 days after the fact.',
      });
    }

    const reportDelayMs = now.getTime() - observedAt.getTime();

    if (reportDelayMs > LATE_REPORT_THRESHOLD_MS) {
      context.warnings.push({
        code: 'late_report',
        message: 'Reported more than two days after the observation.',
      });
    }

    context.record.observed_at = observedAt;
  },
};

export default temporalStage;
