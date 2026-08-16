/**
 * Creates the subjects.
 *
 */

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('subjects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Subjects use neutral references and labels; names and addresses are excluded.
    table.string('reference_code', 16).notNullable().unique();
    table.string('label', 120).notNullable();
    table.text('description');

    table
      .uuid('created_by')
      .references('id')
      .inTable('residents')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');

    table.timestamp('first_seen_at', { useTz: true });
    table.timestamp('last_seen_at', { useTz: true });
    table.integer('sighting_count').notNullable().defaultTo(0);

    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index('last_seen_at', 'subjects_last_seen_at_index');
  });
};

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>} 
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('subjects');
};
