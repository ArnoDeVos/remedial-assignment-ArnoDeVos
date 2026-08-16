/**
 * Data access for sightings and their map and timeline projections.
 */

import BaseRepository from './BaseRepository.js';

/** Columns that are safe to expose through the API. */
const SIGHTING_COLUMNS = Object.freeze([
  'sightings.id',
  'sightings.subject_id',
  'sightings.reporter_id',
  'sightings.position_x',
  'sightings.position_y',
  'sightings.zone_code',
  'sightings.observed_at',
  'sightings.confidence',
  'sightings.status',
  'sightings.review_reason',
  'sightings.notes',
  'sightings.created_at',
]);

export default class SightingRepository extends BaseRepository {
  constructor(connection) {
    super('sightings', connection);
  }

  /**
   * Applies shared sighting filters to a query builder.
   *
   * @param {import('knex').Knex.QueryBuilder} query Knex query builder.
   * @param {object} filters Filters to apply.
   * @param {string} [filters.subjectId] Restrict to one subject.
   * @param {string} [filters.reporterId] Restrict to one reporter.
   * @param {string} [filters.zoneCode] Restrict to one zone.
   * @param {string} [filters.status] Restrict to one status.
   * @param {Date} [filters.from] Earliest observation time.
   * @param {Date} [filters.to] Latest observation time.
   * @returns {import('knex').Knex.QueryBuilder} The supplied query builder.
   */
  static applyFilters(query, filters) {
    if (filters.subjectId) {
      query.where('sightings.subject_id', filters.subjectId);
    }

    if (filters.reporterId) {
      query.where('sightings.reporter_id', filters.reporterId);
    }

    if (filters.zoneCode) {
      query.where('sightings.zone_code', filters.zoneCode);
    }

    if (filters.status) {
      query.where('sightings.status', filters.status);
    } else {
      query.whereNot('sightings.status', 'rejected');
    }

    if (filters.from) {
      query.where('sightings.observed_at', '>=', filters.from);
    }

    if (filters.to) {
      query.where('sightings.observed_at', '<=', filters.to);
    }

    return query;
  }

  /**
   * Returns filtered sightings enriched for display on the map.
   *
   * @param {object} [filters={}] Filters, as accepted by {@link applyFilters}.
   * @param {number} [filters.limit=500] Maximum rows to return.
   * @returns {Promise<Array<object>>} Sightings, newest first.
   */
  async findForMap(filters = {}) {
    const query = this.query()
      .select([
        ...SIGHTING_COLUMNS,
        'subjects.reference_code as subject_reference_code',
        'subjects.label as subject_label',
        'residents.display_name as reporter_name',
      ])
      .join('subjects', 'subjects.id', 'sightings.subject_id')
      .join('residents', 'residents.id', 'sightings.reporter_id')
      .orderBy('sightings.observed_at', 'desc')
      .limit(filters.limit ?? 500);

    return SightingRepository.applyFilters(query, filters);
  }

  /**
   * Returns a subject's filtered sightings in trajectory order.
   *
   * @param {string} subjectId Subject UUID.
   * @param {object} [filters={}] Optional time window.
   * @param {Date} [filters.from] Earliest observation time.
   * @param {Date} [filters.to] Latest observation time.
   * @returns {Promise<Array<object>>} Sightings, oldest first.
   */
  async findTimelineForSubject(subjectId, filters = {}) {
    const query = this.query()
      .select([...SIGHTING_COLUMNS, 'residents.display_name as reporter_name'])
      .join('residents', 'residents.id', 'sightings.reporter_id')
      .orderBy('sightings.observed_at', 'asc');

    return SightingRepository.applyFilters(query, { ...filters, subjectId });
  }

  /**
   * Finds the closest accepted or pending sighting before an observation.
   *
   * @param {string} subjectId Subject UUID.
   * @param {Date} observedAt Observation timestamp.
   * @param {import('knex').Knex.Transaction} [transaction] Optional transaction.
   * @returns {Promise<object|undefined>} The preceding sighting, or undefined.
   */
  async findPreviousSighting(subjectId, observedAt, transaction) {
    return this.query(transaction)
      .where('subject_id', subjectId)
      .where('observed_at', '<', observedAt)
      .whereNot('status', 'rejected')
      .orderBy('observed_at', 'desc')
      .first();
  }

  /**
   * Finds a complete sighting row by its duplicate-detection fingerprint.
   *
   * @param {string} fingerprint Sighting fingerprint.
   * @param {import('knex').Knex.Transaction} [transaction] Optional transaction.
   * @returns {Promise<object|undefined>} The complete sighting, or undefined.
   */
  async findByFingerprint(fingerprint, transaction) {
    return this.query(transaction).where({ fingerprint }).first();
  }

  /**
   * Counts sightings and distinct subjects for each active zone.
   *
   * @param {object} [filters={}] Shared sighting filters.
   * @param {Date} [filters.from] Earliest observation time.
   * @param {Date} [filters.to] Latest observation time.
   * @returns {Promise<Array<{zone_code: string, sighting_count: number, subject_count: number}>>}
   *   Per-zone activity totals.
   */
  async countByZone(filters = {}) {
    const query = this.query()
      .select('sightings.zone_code')
      .count({ sighting_count: '*' })
      .countDistinct({ subject_count: 'sightings.subject_id' })
      .whereNotNull('sightings.zone_code')
      .groupBy('sightings.zone_code');

    const rows = await SightingRepository.applyFilters(query, filters);

    return rows.map((row) => ({
      zone_code: row.zone_code,
      sighting_count: Number.parseInt(row.sighting_count, 10),
      subject_count: Number.parseInt(row.subject_count, 10),
    }));
  }

  /**
     * Counts sightings by hour of day.
   *
   * @param {object} [filters={}] Shared sighting filters.
   * @returns {Promise<Array<{hour: number, sighting_count: number}>>} Hourly activity totals ordered from hour 0 through 23.
   */
  async countByHourOfDay(filters = {}) {
    const query = this.query()
      .select(this.connection.raw('EXTRACT(HOUR FROM observed_at)::int AS hour'))
      .count({ sighting_count: '*' })
      .groupByRaw('EXTRACT(HOUR FROM observed_at)')
      .orderByRaw('EXTRACT(HOUR FROM observed_at)');

    const rows = await SightingRepository.applyFilters(query, filters);

    return rows.map((row) => ({
      hour: row.hour,
      sighting_count: Number.parseInt(row.sighting_count, 10),
    }));
  }

  /**
   * Returns headline dashboard totals in one aggregate query.
   *
   * @param {object} [filters={}] Shared sighting filters.
   * @returns {Promise<{sightings: number, subjects: number, reporters: number, needsReview: number}>}
   *   Dashboard summary values.
   */
  async summarise(filters = {}) {
    const query = this.query().select(
      this.connection.raw('COUNT(*)::int AS sightings'),
      this.connection.raw('COUNT(DISTINCT subject_id)::int AS subjects'),
      this.connection.raw('COUNT(DISTINCT reporter_id)::int AS reporters'),
      this.connection.raw(
        "COUNT(*) FILTER (WHERE status = 'needs_review')::int AS needs_review",
      ),
    );

    const [row] = await SightingRepository.applyFilters(query, filters);

    return {
      sightings: row.sightings,
      subjects: row.subjects,
      reporters: row.reporters,
      needsReview: row.needs_review,
    };
  }
}
