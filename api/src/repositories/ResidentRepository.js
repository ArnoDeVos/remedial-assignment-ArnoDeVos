/**
 * Data access for resident accounts.
 *
 * Public queries explicitly select safe columns so a resident's password hash
 * cannot accidentally reach an API response.
 */

import BaseRepository from './BaseRepository.js';

/** Columns that are safe to expose through the API. */
const PUBLIC_COLUMNS = Object.freeze([
  'id',
  'email',
  'display_name',
  'home_zone_code',
  'role',
  'is_active',
  'last_login_at',
  'created_at',
]);

export default class ResidentRepository extends BaseRepository {
  constructor(connection) {
    super('residents', connection);
  }

  /**
   * Finds a resident by e-mail, including the password hash.
   *
   * This method is intended exclusively for authentication.
   *
   * @param {string} email Lower-cased e-mail address.
   * @returns {Promise<object|undefined>} The full resident row, or undefined.
   */
  async findByEmailWithPassword(email) {
    return this.query().where({ email }).first();
  }

  /**
   * Finds a resident by e-mail without exposing the password hash.
   *
   * @param {string} email Lower-cased e-mail address.
   * @returns {Promise<object|undefined>} The full resident row, or undefined.
   */
  async findByEmail(email) {
    return this.query().select(PUBLIC_COLUMNS).where({ email }).first();
  }

  /**
   * Finds a resident by UUID without exposing the password hash.
   *
   * @param {string} id Resident UUID.
   * @returns {Promise<object|undefined>} The public resident row, or undefined.
   */
  async findPublicById(id) {
    return this.query().select(PUBLIC_COLUMNS).where({ id }).first();
  }

  /**
   * Creates a resident and returns only public fields.
   *
   * @param {object} attributes Resident attributes, including password_hash.
   * @returns {Promise<object>} The inserted public resident row.
   */
  async createResident(attributes) {
    const [row] = await this.query().insert(attributes).returning(PUBLIC_COLUMNS);
    return row;
  }

  /**
   * Stamps the moment a resident last authenticated.
   *
   * @param {string} id Resident UUID.
   * @returns {Promise<void>} Resolves once the timestamp is written.
   */
  async touchLastLogin(id) {
    await this.query().where({ id }).update({ last_login_at: this.connection.fn.now() });
  }

  /**
   * Counts how many sightings each resident contributed.
   *
   * @param {number} [limit=10] Maximum number of residents to return.
   * @returns {Promise<Array<{id: string, display_name: string, sighting_count: number}>>}
   *   Ranked residents, including residents with no sightings.
   */
  async findMostActive(limit = 10) {
    const rows = await this.connection('residents')
      .select(
        'residents.id',
        'residents.display_name',
        'residents.home_zone_code',
        this.connection.raw('COUNT(sightings.id)::int AS sighting_count'),
      )
      .leftJoin('sightings', 'sightings.reporter_id', 'residents.id')
      .groupBy('residents.id', 'residents.display_name', 'residents.home_zone_code')
      .orderBy('sighting_count', 'desc')
      .orderBy('residents.display_name', 'asc')
      .limit(limit);

    return rows;
  }
}
