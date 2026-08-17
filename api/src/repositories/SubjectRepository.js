/**
 * Data access for observed subjects.
 */

import BaseRepository from './BaseRepository.js';

export default class SubjectRepository extends BaseRepository {
  constructor(connection) {
    super('subjects', connection);
  }

  /**
   * Finds a subject by its human-readable reference code.
   *
   * @param {string} referenceCode Subject reference code.
   * @returns {Promise<object|undefined>} The subject, or undefined.
   */
  async findByReferenceCode(referenceCode) {
    return this.query().where({ reference_code: referenceCode }).first();
  }

  /**
   * Lists subjects, most recently seen first.
   *
   * @param {object} [options] Query options.
   * @param {string} [options.search] Case-insensitive filter on label or code.
   * @param {number} [options.limit=50] Maximum rows to return.
   * @returns {Promise<Array<object>>} Matching subjects.
   */
  async findRecentlySeen({ search, limit = 50 } = {}) {
    const query = this.query()
      .select('*')
      .orderByRaw('last_seen_at DESC NULLS LAST')
      .limit(limit);

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('label', `%${search}%`)
          .orWhereILike('reference_code', `%${search}%`);
      });
    }

    return query;
  }

  /**
   * Recalculates a subject's cached sighting statistics.
   *
   * @param {string} subjectId Subject UUID.
   * @param {import('knex').Knex.Transaction} [transaction] Optional transaction.
   * @returns {Promise<void>} 
   */
  async refreshCounters(subjectId, transaction) {
    const runner = transaction ?? this.connection;

    await runner.raw(
      `
        UPDATE subjects
           SET first_seen_at  = aggregated.first_seen_at,
               last_seen_at   = aggregated.last_seen_at,
               sighting_count = aggregated.sighting_count,
               updated_at     = now()
          FROM (
                 SELECT MIN(observed_at) AS first_seen_at,
                        MAX(observed_at) AS last_seen_at,
                        COUNT(*)::int    AS sighting_count
                   FROM sightings
                  WHERE subject_id = ?
                    AND status <> 'rejected'
               ) AS aggregated
         WHERE subjects.id = ?
      `,
      [subjectId, subjectId],
    );
  }

  /**
   * Generates an unused human-readable subject reference code
   *
   * @param {number} [attempts=10] Maximum number of collision retries.
   * @returns {Promise<string>} The first unused reference code.
   * @throws {Error} When no unused code is found within the retry limit.
   */
  async generateReferenceCode(attempts = 10) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const suffix = Array.from(
        { length: 4 },
        () => alphabet[Math.floor(Math.random() * alphabet.length)],
      ).join('');

      const candidate = `SBJ-${suffix}`;
      const taken = await this.findByReferenceCode(candidate);

      if (!taken) {
        return candidate;
      }
    }

    throw new Error('Could not generate a free subject reference code.');
  }
}
