/**
 * Seeds for resident accounts 
 */

const bcrypt = require('bcryptjs');

/** Shared password for every seeded account. */
const DEMO_PASSWORD = 'Buurtwacht!2026';

/** Accounts, one per zone + a moderator. */
const DEMO_RESIDENTS = [
  {
    email: 'lotte@buurtwacht.local',
    display_name: 'Lotte V.',
    home_zone_code: 'Z-MOLLEM',
    role: 'resident',
  },
  {
    email: 'samir@buurtwacht.local',
    display_name: 'Samir B.',
    home_zone_code: 'Z-ZELLIK',
    role: 'resident',
  },
  {
    email: 'joke@buurtwacht.local',
    display_name: 'Joke D.',
    home_zone_code: 'Z-BEKKERZEEL',
    role: 'resident',
  },
  {
    email: 'peter@buurtwacht.local',
    display_name: 'Peter L.',
    home_zone_code: 'Z-RELEGEM',
    role: 'resident',
  },
  {
    email: 'nadia@buurtwacht.local',
    display_name: 'Nadia K.',
    home_zone_code: 'Z-KOBBEGEM',
    role: 'resident',
  },
  {
    email: 'moderator@buurtwacht.local',
    display_name: 'Wijkagent',
    home_zone_code: 'Z-ASSE',
    role: 'moderator',
  },
];

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>} 
 */
exports.seed = async function seed(knex) {
  const existing = await knex('residents')
    .whereIn(
      'email',
      DEMO_RESIDENTS.map((resident) => resident.email),
    )
    .pluck('email');

  const missing = DEMO_RESIDENTS.filter((resident) => !existing.includes(resident.email));

  if (missing.length === 0) {
    return;
  }

  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, rounds);

  await knex('residents').insert(
    missing.map((resident) => ({ ...resident, password_hash: passwordHash })),
  );
};
