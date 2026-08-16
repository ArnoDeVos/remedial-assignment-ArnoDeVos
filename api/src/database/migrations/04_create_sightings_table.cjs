/**
 * Creates sightings that connect subjects, reporters, positions, and times.
 *
 */

/**
 * @param {import('knex').Knex} knex knex Knex database connection.
 * @returns {Promise<void>} 
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('sightings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('subject_id')
      .notNullable()
      .references('id')
      .inTable('subjects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

    table
      .uuid('reporter_id')
      .notNullable()
      .references('id')
      .inTable('residents')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');

    table.integer('position_x').notNullable();
    table.integer('position_y').notNullable();

  // The API derives the zone from the grid position; it may remain unknown.
    table
      .string('zone_code', 32)
      .references('code')
      .inTable('zones')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');

    table.timestamp('observed_at', { useTz: true }).notNullable();

    table
      .enu('confidence', ['low', 'medium', 'high'], {
        useNative: true,
        enumName: 'sighting_confidence',
      })
      .notNullable()
      .defaultTo('medium');

    table
      .enu('status', ['accepted', 'needs_review', 'rejected'], {
        useNative: true,
        enumName: 'sighting_status',
      })
      .notNullable()
      .defaultTo('accepted');

    table.text('review_reason');
    table.text('notes');

    table.string('fingerprint', 64).notNullable().unique();

    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // These indexes cover subject timelines, recency, zone filters, and reporters.
    table.index(['subject_id', 'observed_at'], 'sightings_subject_timeline_index');
    table.index('observed_at', 'sightings_observed_at_index');
    table.index('zone_code', 'sightings_zone_code_index');
    table.index('reporter_id', 'sightings_reporter_id_index');
  });
};

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>} 
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('sightings');
  await knex.raw('DROP TYPE IF EXISTS sighting_confidence');
  await knex.raw('DROP TYPE IF EXISTS sighting_status');
};
