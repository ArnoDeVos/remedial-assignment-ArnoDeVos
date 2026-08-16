/**
 * Read access to the neighbourhood map geometry.
 *
 */

import database from '../database/connection.js';

export default class NeighbourhoodRepository {
  /**
   * @param {import('knex').Knex} [connection=database] Knex connection.
   */
  constructor(connection = database) {
    this.connection = connection;
    this.cache = null;
  }

  /**
   * Returns all zones and streets in the neighbourhood map.
   *
   * @returns {Promise<{zones: Array<object>, streets: Array<object>}>} The cached map geometry.
   */
  async findMap() {
    if (this.cache) {
      return this.cache;
    }

    const [zones, streets] = await Promise.all([
      this.connection('zones').select('code', 'name', 'description', 'polygon').orderBy('code'),
      this.connection('streets').select('name', 'path').orderBy('name'),
    ]);

    this.cache = { zones, streets };

    return this.cache;
  }

  /**
   * Returns every known zone code.
   *
   * @returns {Promise<Set<string>>} The zone codes.
   */
  async findZoneCodes() {
    const { zones } = await this.findMap();
    return new Set(zones.map((zone) => zone.code));
  }

  /**
   * Clears the cached map geometry.
   *
   * @returns {void}
   */
  invalidateCache() {
    this.cache = null;
  }
}
