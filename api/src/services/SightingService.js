/**
 * Sighting service.
 * Orchestrates the write path: resolve the subject, run the submission through the cleaning pipeline, persist it and refresh the subject's cached counters.
 */

import { AuthorisationError, NotFoundError } from '../errors/ApplicationError.js';
import { presentSighting } from '../utils/presenters.js';

export default class SightingService {
  /**
   * @param {object} dependencies Injected collaborators.
   * @param {import('../repositories/SightingRepository.js').default} dependencies.sightingRepository
   *   Access to sightings.
   * @param {import('../repositories/SubjectRepository.js').default} dependencies.subjectRepository
   *   Access to subjects.
   * @param {import('./SubjectService.js').default} dependencies.subjectService
   *   Used to create a subject on first sighting.
   * @param {import('../validation/CleaningPipeline.js').default} dependencies.cleaningPipeline
   *   The chain of cleaning stages every submission passes through.
   */
  constructor({ sightingRepository, subjectRepository, subjectService, cleaningPipeline }) {
    this.sightingRepository = sightingRepository;
    this.subjectRepository = subjectRepository;
    this.subjectService = subjectService;
    this.cleaningPipeline = cleaningPipeline;
  }

  /**
  * Cleans and registers a sighting in one database transaction.
   *
   * @param {object} input input Validated sighting input.
   * @param {object} reporter Authenticated resident database row.
   * @returns {Promise<{sighting: object, warnings: Array<object>}>} Presented sighting and cleaning warnings.
   * @throws {NotFoundError} When a supplied subject does not exist.
   * @throws {import('../errors/ApplicationError.js').ValidationError} When a
   *   cleaning stage refuses the submission.
   * @throws {import('../errors/ApplicationError.js').ConflictError} When the
   *   same observation was already registered.
   */
  async register(input, reporter) {
    return this.sightingRepository.transaction(async (transaction) => {
      const subject = input.subjectId
        ? await this.resolveExistingSubject(input.subjectId, transaction)
        : await this.subjectService.createForSighting(
            { ...input.newSubject, createdBy: reporter.id },
            transaction,
          );

      const { record, warnings, status, reviewReason } = await this.cleaningPipeline.run(input, {
        reporter,
        subjectId: subject.id,
        sightingRepository: this.sightingRepository,
        transaction,
        now: new Date(),
      });

      const sighting = await this.sightingRepository.create(
        {
          ...record,
          subject_id: subject.id,
          reporter_id: reporter.id,
          status,
          review_reason: reviewReason,
        },
        transaction,
      );

      await this.subjectRepository.refreshCounters(subject.id, transaction);

      return {
        sighting: presentSighting({
          ...sighting,
          subject_reference_code: subject.reference_code,
          subject_label: subject.label,
          reporter_name: reporter.display_name,
        }),
        warnings,
      };
    });
  }

  /**
   * Loads an existing subject inside the active registration transaction.
   *
   * @param {string} subjectId Subject identifier.
   * @param {import('knex').Knex.Transaction} transaction Active transaction.
   * @returns {Promise<object>} Raw subject database row.
   * @throws {NotFoundError} When the subject does not exist.
   */
  async resolveExistingSubject(subjectId, transaction) {
    const subject = await this.subjectRepository.findById(subjectId, transaction);

    if (!subject) {
      throw new NotFoundError('Subject');
    }

    return subject;
  }

  /**
   * Lists sightings for the map.
   *
   * @param {object} [filters={}] Filters accepted by the repository.
   * @returns {Promise<Array<object>>} Presented sightings, newest first.
   */
  async list(filters = {}) {
    const sightings = await this.sightingRepository.findForMap(filters);
    return sightings.map(presentSighting);
  }

  /**
   * Produces the dashboard summary for a time window.
   *
   * @param {object} [filters={}] Optional time window.
   * @returns {Promise<object>} Aggregate counts.
   */
  async summarise(filters = {}) {
    return this.sightingRepository.summarise(filters);
  }

  /**
   * Lists sightings waiting for a moderator.
   *
   * @param {number} [limit=100] Maximum rows to return.
   * @returns {Promise<Array<object>>} Presented sightings needing review.
   */
  async listNeedingReview(limit = 100) {
    const sightings = await this.sightingRepository.findForMap({
      status: 'needs_review',
      limit,
    });

    return sightings.map(presentSighting);
  }

  /**
   * Resolves a flagged sighting.
   *
   * @param {string} sightingId Sighting UUID.
   * @param {object} decision The moderator's decision.
   * @param {'accepted'|'rejected'} decision.status New status.
   * @param {string} [decision.reason] Why the decision was made.
   * @param {object} moderator The authenticated resident deciding.
   * @returns {Promise<object>} The updated sighting.
   * @throws {AuthorisationError} When the resident is not a moderator.
   * @throws {NotFoundError} When no such sighting exists.
   */
  async review(sightingId, { status, reason }, moderator) {
    if (moderator.role !== 'moderator') {
      throw new AuthorisationError('Only a moderator can resolve a flagged sighting.');
    }

    const existing = await this.sightingRepository.findById(sightingId);

    if (!existing) {
      throw new NotFoundError('Sighting');
    }

    const updated = await this.sightingRepository.updateById(sightingId, {
      status,
      review_reason: reason ?? `Resolved as ${status} by ${moderator.display_name}.`,
    });

    await this.subjectRepository.refreshCounters(existing.subject_id);

    return presentSighting(updated);
  }
}
