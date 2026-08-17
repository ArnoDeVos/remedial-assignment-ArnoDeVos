/**
 * Assembles the default cleaning pipeline.
 *
 * 1. sanitisation — cheapest and everything after it benefits from clean text.
 * 2. temporal     — pure arithmetic on the submitted timestamp, no database.
 * 3. bounds       — pure geometry and it produces the zone later stages want.
 * 4. duplicate    — first stage that touches the database, runs only once the submission is known to be well-formed.
 * 5. plausibility — most expensive: needs the subject's previous sighting.
 *
 */

import CleaningPipeline from '../CleaningPipeline.js';
import sanitisationStage from './sanitisationStage.js';
import temporalStage from './temporalStage.js';
import boundsStage from './boundsStage.js';
import duplicateStage from './duplicateStage.js';
import plausibilityStage from './plausibilityStage.js';

/**
 * Builds the pipeline used when a resident registers a sighting.
 *
 * @returns {CleaningPipeline} A pipeline with every stage, in order.
 */
export function createSightingPipeline() {
  return new CleaningPipeline([
    sanitisationStage,
    temporalStage,
    boundsStage,
    duplicateStage,
    plausibilityStage,
  ]);
}

export {
  sanitisationStage,
  temporalStage,
  boundsStage,
  duplicateStage,
  plausibilityStage,
};
