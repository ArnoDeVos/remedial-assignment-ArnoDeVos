/**
 * Stage 4 — duplicate detection.
 *
 * Computes the sighting's fingerprint and refuses submissions that match one already stored.
 *
 */

import { createRequire } from 'node:module';

import { ConflictError } from '../../errors/ApplicationError.js';

const require = createRequire(import.meta.url);
const { createFingerprint } = require('../../utils/fingerprint.cjs');

const duplicateStage = {
  name: 'duplicate',

  /**
   * @param {object} context Shared pipeline context.
   * @returns {Promise<void>} Resolves when the sighting is known to be new.
   */
  async process(context) {
    const fingerprint = createFingerprint({
      reporterId: context.reporter.id,
      subjectId: context.subjectId,
      positionX: context.record.position_x,
      positionY: context.record.position_y,
      observedAt: context.record.observed_at,
    });

    const existing = await context.sightingRepository.findByFingerprint(
      fingerprint,
      context.transaction,
    );

    if (existing) {
      throw new ConflictError('You already registered this sighting.', {
        existingSightingId: existing.id,
      });
    }

    context.record.fingerprint = fingerprint;
  },
};

export default duplicateStage;
