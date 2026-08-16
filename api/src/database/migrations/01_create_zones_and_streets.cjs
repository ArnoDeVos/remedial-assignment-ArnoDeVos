/**
 * Creates the fictional neighbourhood geometry tables.
 * Coordinates are stored as JSONB because the application uses a small flat
 * coordinate grid and does not require PostGIS spatial types or operations.
 */

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('zones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 32).notNullable().unique();
    table.string('name', 120).notNullable();
    table.text('description');
    table.jsonb('polygon').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('streets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 120).notNullable().unique();
    table.jsonb('path').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * Removes the neighbourhood geometry tables in reverse creation order.
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('streets');
  await knex.schema.dropTableIfExists('zones');
};
