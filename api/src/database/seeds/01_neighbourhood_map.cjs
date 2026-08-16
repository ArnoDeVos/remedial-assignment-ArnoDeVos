/**
 * Seeds the map, zones and streets.
 */

const neighbourhood = require('../../domain/neighbourhood.json');

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>} 
 */
exports.seed = async function seed(knex) {
  const zoneRows = neighbourhood.zones.map((zone) => ({
    code: zone.code,
    name: zone.name,
    description: zone.description,
    polygon: JSON.stringify(zone.polygon),
  }));

  await knex('zones').insert(zoneRows).onConflict('code').merge(['name', 'description', 'polygon']);

  const streetRows = neighbourhood.streets.map((street) => ({
    name: street.name,
    path: JSON.stringify(street.path),
  }));

  await knex('streets').insert(streetRows).onConflict('name').merge(['path']);
};
