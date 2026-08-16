/**
 * The sighting cleaning pipeline.
 */

import logger from '../utils/logger.js';

export default class CleaningPipeline {
  /**
   * @param {Array<{name: string, process: (context: object) => Promise<void>|void}>} stages Stages to run, in order.
   */
  constructor(stages = []) {
    this.stages = stages;
  }

  /**
   * Appends a stage to the end of the chain.
   *
   * @param {{name: string, process: (context: object) => Promise<void>|void}} stage Stage to add.
   * @returns {CleaningPipeline} This pipeline, so calls can be chained.
   */
  use(stage) {
    this.stages.push(stage);
    return this;
  }

  /**
   * Runs every stage against one submission.
   *
   * @param {object} input The validated request payload.
   * @param {object} [context={}] Extra context stages may need, such as the
   *   reporting resident or an open transaction.
   * @returns {Promise<{record: object, warnings: Array<object>, status: string, reviewReason: string|null}>}
   *   The cleaned record plus everything the stages concluded about it.
   * @throws {import('../errors/ApplicationError.js').ApplicationError} When a
   *   stage rejects the submission.
   */
  async run(input, context = {}) {
    /**
     * The shared context.
     */
    const pipelineContext = {
      input,
      record: {},
      warnings: [],
      status: 'accepted',
      reviewReason: null,
      ...context,
    };

    for (const stage of this.stages) {
      await stage.process(pipelineContext);
    }

    if (pipelineContext.warnings.length > 0) {
      logger.debug('Sighting passed the pipeline with warnings', {
        warnings: pipelineContext.warnings.map((warning) => warning.code),
      });
    }

    return {
      record: pipelineContext.record,
      warnings: pipelineContext.warnings,
      status: pipelineContext.status,
      reviewReason: pipelineContext.reviewReason,
    };
  }
}
