/**
 * Base repository.
 * CRUD belongs in this base repository.
 */

import database from '../database/connection.js';

export default class BaseRepository {
  /**
   * @param {string} tableName Database table managed by the repository
   * @param {import('knex').Knex} [connection=database] Knex connection.
   */
  constructor(tableName, connection = database) {
    if (new.target === BaseRepository) {
      throw new TypeError('BaseRepository cannot be instantiated directly.');
    }

    this.tableName = tableName;
    this.connection = connection;
  }

  /**
   * Creates a fresh query builder for this repository's table.
   *
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {import('knex').Knex.QueryBuilder} Scoped query builder.
   */
  query(transaction) {
    return (transaction ?? this.connection)(this.tableName);
  }

  /**
   * Finds a row by its identifier.
   *
   * @param {string} id Primary key value.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<object|undefined>} Matching row, when present
   */
  async findById(id, transaction) {
    return this.query(transaction).where({ id }).first();
  }

  /**
   * Finds the first row matching the supplied equality criteria.
   *
   * @param {object} criteria Equality criteria.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<object|undefined>} Matching row, when present.
   */
  async findOneBy(criteria, transaction) {
    return this.query(transaction).where(criteria).first();
  }

  /**
   * Finds all rows matching the supplied equality criteria.
   *
   * @param {object} [criteria={}] Column/value pairs to match.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<Array<object>>} Matching row, when present.
   */
  async findAllBy(criteria = {}, transaction) {
    return this.query(transaction).where(criteria);
  }

  /**
   * Inserts one row and returns it in full.
   *
   * @param {object} attributes attributes Values to insert.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<object>} Inserted row.
   */
  async create(attributes, transaction) {
    const [row] = await this.query(transaction).insert(attributes).returning('*');
    return row;
  }

  /**
   * Updates a row by its identifier.
   *
   * @param {string} id id Row identifier.
   * @param {object} attributes attributes Values to update.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<object|undefined>} Updated row, when present.
   */
  async updateById(id, attributes, transaction) {
    const [row] = await this.query(transaction)
      .where({ id })
      .update({ ...attributes, updated_at: this.connection.fn.now() })
      .returning('*');

    return row;
  }

  /**
   * Deletes a row by its identifier.
   *
   * @param {string} id id Row identifier.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<number>} Number of deleted rows.
   */
  async deleteById(id, transaction) {
    return this.query(transaction).where({ id }).del();
  }

  /**
   * Counts rows matching the supplied equality criteria.
   *
   * @param {object} [criteria={}] Equality criteria.
   * @param {import('knex').Knex.Transaction} [transaction] Active transaction.
   * @returns {Promise<number>} The number of matching rows.
   */
  async countBy(criteria = {}, transaction) {
    const [{ count }] = await this.query(transaction).where(criteria).count({ count: '*' });
    return Number.parseInt(count, 10);
  }

  /**
   * Runs a callback inside a database transaction.
   *
   * @template T
   * @param {(transaction: import('knex').Knex.Transaction) => Promise<T>} callback Work to execute atomically.
   * @returns {Promise<T>} Callback result after the transaction commits.
   */
  async transaction(callback) {
    return this.connection.transaction(callback);
  }
}
