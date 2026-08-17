/**
 * Subject service.
 * It looks subjects up, lists them and creates them on behalf of the sighting
 * service when a resident reports someone nobody has registered yet.
 */

import { NotFoundError } from '../errors/ApplicationError.js';
import { presentSubject } from '../utils/presenters.js';
import { cleanText } from '../validation/stages/sanitisationStage.js';

export default class SubjectService {
  /**
   * @param {object} dependencies Injected collaborators.
   * @param {import('../repositories/SubjectRepository.js').default} dependencies.subjectRepository
   *   Repository used to access and create subjects.
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * Lists subjects ordered by their most recent sighting.
   *
   * @param {object} [filters={}] Repository search and pagination filters.
   * @returns {Promise<Array<object>>} Client-facing subjects
   */
  async list(filters = {}) {
    const subjects = await this.subjectRepository.findRecentlySeen(filters);
    return subjects.map(presentSubject);
  }

  /**
   * Fetches one subject by id.
   *
   * @param {string} id Subject identifier
   * @returns {Promise<object>} Raw subject database row.
   * @throws {NotFoundError} When the subject does not exist.
   */
  async requireById(id) {
    const subject = await this.subjectRepository.findById(id);

    if (!subject) {
      throw new NotFoundError('Subject');
    }

    return subject;
  }

  /**
   * Fetches one subject for an API response.
   *
   * @param {string} id Subject identifier.
   * @returns {Promise<object>} Client-facing subject.
   * @throws {NotFoundError} When the subject does not exist.
   */
  async getById(id) {
    return presentSubject(await this.requireById(id));
  }

  /**
   * Creates a subject while registering a sighting.
   *
   * @param {object} input Subject input.
   * @param {string} input.label Display label.
   * @param {string} [input.description] Longer free text.
   * @param {string} input.createdBy UUID of the resident registering them.
   * @param {import('knex').Knex.Transaction} [transaction] Optional transaction,
   *   so creating a subject and its first sighting is one atomic operation.
   * @returns {Promise<object>} Newly created raw subject database row.
   */
  async createForSighting({ label, description, createdBy }, transaction) {
    const referenceCode = await this.subjectRepository.generateReferenceCode();

    return this.subjectRepository.create(
      {
        reference_code: referenceCode,
        label: cleanText(label),
        description: cleanText(description),
        created_by: createdBy,
      },
      transaction,
    );
  }
}
