/**
 * Seeds simulated neighbourhood activity.
 */

const neighbourhood = require('../../domain/neighbourhood.json');
const { resolveZone, distanceBetween } = require('../../domain/geometry.cjs');
const { createFingerprint } = require('../../utils/fingerprint.cjs');

const DAYS_OF_HISTORY = 7;

const CHANCE_SUBJECT_WALKS = 0.75;

const CHANCE_MOMENT_IS_OBSERVED = 0.45;

/** metres per second. */
const WALKING_SPEED = 1.35;

const SAMPLE_INTERVAL_SECONDS = 90;

/** Fixed starting value for the pseudo random generator. */
const RANDOM_SEED = 20260817;

/**
 * Routes the suspicious people take
 */
const SUBJECT_ROUTES = [
  {
    reference_code: 'SBJ-A1',
    label: 'Person with a red raincoat',
    description: 'Walks a small terrier, usually early in the morning.',
    startHour: 7,
    waypoints: [[60, 120], [150, 250], [300, 330], [520, 360], [700, 300], [880, 200]],
  },
  {
    reference_code: 'SBJ-B2',
    label: 'Courier on an orange bike',
    description: 'Delivery rider, follows the main streets at speed.',
    startHour: 11,
    waypoints: [[980, 60], [700, 120], [420, 250], [300, 470], [340, 640], [660, 660]],
  },
  {
    reference_code: 'SBJ-C3',
    label: 'Teenager with a skateboard',
    description: 'Circles the park most afternoons.',
    startHour: 15,
    waypoints: [[350, 300], [650, 300], [650, 430], [350, 430], [350, 300], [300, 250]],
  },
  {
    reference_code: 'SBJ-D4',
    label: 'Older man with a walking stick',
    description: 'Short, slow loop around the market square.',
    startHour: 10,
    waypoints: [[420, 585], [560, 585], [640, 640], [480, 690], [380, 620]],
  },
  {
    reference_code: 'SBJ-E5',
    label: 'Two people in matching jackets',
    description: 'Seen together, always heading towards the tram stop.',
    startHour: 8,
    waypoints: [[120, 640], [280, 480], [420, 250], [620, 120], [900, 120]],
  },
  {
    reference_code: 'SBJ-F6',
    label: 'Runner in a yellow vest',
    description: 'Long evening loop through every zone.',
    startHour: 19,
    waypoints: [[80, 80], [400, 80], [760, 200], [860, 500], [600, 660], [220, 600], [80, 300]],
  },
  {
    reference_code: 'SBJ-G7',
    label: 'Person pushing a shopping trolley',
    description: 'Between the market square and the allotments.',
    startHour: 13,
    waypoints: [[500, 620], [700, 560], [850, 420], [960, 300]],
  },
  {
    reference_code: 'SBJ-H8',
    label: 'Child on a scooter',
    description: 'Short trip from the school to the park entrance.',
    startHour: 16,
    waypoints: [[150, 60], [150, 240], [300, 300], [420, 340]],
  },
];

/** Text notes a resident might add. */
const NOTE_POOL = [
  'Passed by without stopping.',
  'Waited at the corner for a few minutes.',
  'Walking in the direction of the tram stop.',
  'Same route as yesterday.',
  'Nothing unusual, just noting it down.',
  null,
  null,
  null,
];

/**
 * Pseudo random generator (mulberry32).
 *
 * @param {number} seed
 * @returns {() => number} 
 */
function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Measures the consecutive segments of an ordered route.
 *
 * @param {Array<Array<number>>} waypoints Ordered `[x, y]` coordinates
 * @returns {{segments: Array<object>, totalLength: number}} Measured route data.
 */
function measureRoute(waypoints) {
  const segments = [];
  let totalLength = 0;

  for (let i = 1; i < waypoints.length; i += 1) {
    const from = { x: waypoints[i - 1][0], y: waypoints[i - 1][1] };
    const to = { x: waypoints[i][0], y: waypoints[i][1] };
    const length = distanceBetween(from, to);

    segments.push({ from, to, length, startsAt: totalLength });
    totalLength += length;
  }

  return { segments, totalLength };
}

/**
 * Finds the rounded position reached after travelling along a measured route.
 *
 * @param {{segments: Array<object>, totalLength: number}} route Measured route.
 * @param {number} travelled Distance travelled from the route's start.
 * @returns {{x: number, y: number}} Interpolated route position.
 */
function positionAlongRoute(route, travelled) {
  const clamped = Math.min(Math.max(travelled, 0), route.totalLength);

  const segment =
    route.segments.find(
      (candidate) =>
        clamped >= candidate.startsAt && clamped <= candidate.startsAt + candidate.length,
    ) ?? route.segments[route.segments.length - 1];

  const ratio = segment.length === 0 ? 0 : (clamped - segment.startsAt) / segment.length;

  return {
    x: Math.round(segment.from.x + (segment.to.x - segment.from.x) * ratio),
    y: Math.round(segment.from.y + (segment.to.y - segment.from.y) * ratio),
  };
}

/**
 * Selects a reporter, favouring residents who live in the sighting's zone.
 *
 * Residents who live in the zone are preferred, which produces a believable
 * distribution: people report what happens on their own street. When nobody
 * lives there, any resident will do.
 *
 * @param {Array<object>} residents All residents
 * @param {string|null} zoneCode Zone the sighting happened in.
 * @param {() => number} random Random source.
 * @returns {object} The chosen resident row.
 */
function pickReporter(residents, zoneCode, random) {
  const locals = residents.filter((resident) => resident.home_zone_code === zoneCode);
  const pool = locals.length > 0 && random() < 0.7 ? locals : residents;

  return pool[Math.floor(random() * pool.length)];
}

/**
 * Selects a confidence level using the configured probability distribution.
 *
 * @param {() => number} random returning a number in `[0, 1)`.
 * @returns {'low'|'medium'|'high'} The selected confidence.
 */
function pickConfidence(random) {
  const roll = random();

  if (roll < 0.2) {
    return 'low';
  }

  return roll < 0.75 ? 'medium' : 'high';
}

/**
 * Simulates historical sightings for one subject walking a defined route.
 *
 * @param {object} context Simulation context.
 * @param {object} context.subject Persisted subject database row.
 * @param {object} context.routeDefinition Subject route and departure settings.
 * @param {Array<object>} context.residents Available reporter database rows.
 * @param {() => number} context.random random Function returning a number in `[0, 1)`.
 * @param {Date} context.now now Reference time for the simulation.
 * @returns {Array<object>} Generated sighting database rows.
 */
function simulateSubject({ subject, routeDefinition, residents, random, now }) {
  const route = measureRoute(routeDefinition.waypoints);
  const rows = [];

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo -= 1) {
    if (random() > CHANCE_SUBJECT_WALKS) {
      continue;
    }

    const departure = new Date(now);
    departure.setDate(departure.getDate() - daysAgo);
    departure.setHours(routeDefinition.startHour, Math.floor(random() * 60), 0, 0);

    if (departure > now) {
      continue;
    }

    const walkSeconds = route.totalLength / WALKING_SPEED;

    for (let elapsed = 0; elapsed <= walkSeconds; elapsed += SAMPLE_INTERVAL_SECONDS) {
      if (random() > CHANCE_MOMENT_IS_OBSERVED) {
        continue;
      }

      const position = positionAlongRoute(route, elapsed * WALKING_SPEED);
      const observedAt = new Date(departure.getTime() + elapsed * 1000);

      if (observedAt > now) {
        break;
      }

      const zone = resolveZone(position.x, position.y, neighbourhood.zones);
      const reporter = pickReporter(residents, zone ? zone.code : null, random);

      rows.push({
        subject_id: subject.id,
        reporter_id: reporter.id,
        position_x: position.x,
        position_y: position.y,
        zone_code: zone ? zone.code : null,
        observed_at: observedAt,
        confidence: pickConfidence(random),
        status: 'accepted',
        notes: NOTE_POOL[Math.floor(random() * NOTE_POOL.length)],
        fingerprint: createFingerprint({
          reporterId: reporter.id,
          subjectId: subject.id,
          positionX: position.x,
          positionY: position.y,
          observedAt,
        }),
      });
    }
  }

  return rows;
}

/**
 * Builds deliberately impossible follow-up sightings for the demo review queue.
 *
 * Each one places a subject on the far side of the neighbourhood twenty seconds
 * after a real sighting — the exact situation the plausibility stage is meant
 * to catch. Twenty seconds rather than a minute so that even the closest
 * candidate implies well over the 12 m/s threshold, and the seeded reason is
 * therefore always true rather than usually true.
 *
 * @param {Array<object>} acceptedRows Previously generated accepted sightings.
 * @param {Array<object>} residents Available residents.
 * @param {() => number} random Function returning a number in `[0, 1)`.
 * @returns {Array<object>} Suspicious sightings requiring moderator review.
 */
function buildImplausibleSightings(acceptedRows, residents, random) {
  const candidates = acceptedRows.filter((row) => row.position_x < 300).slice(0, 4);
  return candidates.map((row) => {
    const observedAt = new Date(new Date(row.observed_at).getTime() + 20 * 1000);
    const positionX = 950;
    const positionY = 620;
    const zone = resolveZone(positionX, positionY, neighbourhood.zones);
    const reporter = residents[Math.floor(random() * residents.length)];

    return {
      subject_id: row.subject_id,
      reporter_id: reporter.id,
      position_x: positionX,
      position_y: positionY,
      zone_code: zone ? zone.code : null,
      observed_at: observedAt,
      confidence: 'low',
      status: 'needs_review',
      review_reason:
        'Implausible movement: the previous sighting is too far away for the time elapsed.',
      notes: 'Fairly sure it was the same person, but I could be wrong.',
      fingerprint: createFingerprint({
        reporterId: reporter.id,
        subjectId: row.subject_id,
        positionX,
        positionY,
        observedAt,
      }),
    };
  });
}

/**
 * Refreshes denormalised sighting counters for all subjects with sightings.
 *
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>} Resolves after the counters have been updated.
 */
async function refreshSubjectCounters(knex) {
  await knex.raw(`
    UPDATE subjects
       SET first_seen_at   = aggregated.first_seen_at,
           last_seen_at    = aggregated.last_seen_at,
           sighting_count  = aggregated.sighting_count,
           updated_at      = now()
      FROM (
             SELECT subject_id,
                    MIN(observed_at) AS first_seen_at,
                    MAX(observed_at) AS last_seen_at,
                    COUNT(*)::int    AS sighting_count
               FROM sightings
              WHERE status <> 'rejected'
              GROUP BY subject_id
           ) AS aggregated
     WHERE subjects.id = aggregated.subject_id
  `);
}

/**
 * @param {import('knex').Knex} knex Knex database connection.
 * @returns {Promise<void>} Resolves when seeding is complete or unnecessary.
 */
exports.seed = async function seed(knex) {
  const [{ count }] = await knex('subjects').count({ count: '*' });

  if (Number.parseInt(count, 10) > 0) {
    return;
  }

  const residents = await knex('residents').select('id', 'home_zone_code');

  // Sightings require an existing resident to act as their reporter.
  if (residents.length === 0) {
    throw new Error('Cannot simulate activity before residents are seeded.');
  }

  const random = createRandom(RANDOM_SEED);
  const now = new Date();

  const subjects = await knex('subjects')
    .insert(
      SUBJECT_ROUTES.map((route) => ({
        reference_code: route.reference_code,
        label: route.label,
        description: route.description,
        created_by: residents[0].id,
      })),
    )
    .returning(['id', 'reference_code']);

  const sightingRows = subjects.flatMap((subject) =>
    simulateSubject({
      subject,
      routeDefinition: SUBJECT_ROUTES.find(
        (route) => route.reference_code === subject.reference_code,
      ),
      residents,
      random,
      now,
    }),
  );

  const allRows = [...sightingRows, ...buildImplausibleSightings(sightingRows, residents, random)];
  const unique = new Map(allRows.map((row) => [row.fingerprint, row]));

  await knex.batchInsert('sightings', [...unique.values()], 200);
  await refreshSubjectCounters(knex);
};
