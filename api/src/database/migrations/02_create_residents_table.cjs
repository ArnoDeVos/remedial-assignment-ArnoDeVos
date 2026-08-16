/**
 * Creates residents.
 *
 */

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>} 
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('residents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // The application must normalize emails to lower case before persistence.
    table.string('email', 254).notNullable().unique();
    table.string('display_name', 80).notNullable();
    table.string('password_hash', 100).notNullable();

    // Where the resident lives.
    table
      .string('home_zone_code', 32)
      .references('code')
      .inTable('zones')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');

    // Two roles: a resident reports and reads + an admin
    table
      .enu('role', ['resident', 'moderator'], {
        useNative: true,
        enumName: 'resident_role',
      })
      .notNullable()
      .defaultTo('resident');

    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index('home_zone_code', 'residents_home_zone_code_index');
  });
};

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('residents');
  await knex.raw('DROP TYPE IF EXISTS resident_role');
};
