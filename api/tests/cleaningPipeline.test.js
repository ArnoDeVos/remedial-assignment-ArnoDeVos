/**
 * Tests for the sighting cleaning pipeline.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSightingPipeline } from '../src/validation/stages/index.js';
import { ConflictError, ValidationError } from '../src/errors/ApplicationError.js';

/** A resident stand-in; the pipeline only ever reads the id. */
const REPORTER = Object.freeze({ id: '11111111-1111-4111-8111-111111111111' });

/** A subject stand-in. */
const SUBJECT_ID = '22222222-2222-4222-8222-222222222222';

/** Fixed "now", so the temporal tests do not depend on the wall clock. */
const NOW = new Date('2026-08-14T12:00:00.000Z');

/**
 * Builds a stub standing in for SightingRepository.
 *
 * @param {object} [options={}] What the stub should pretend to hold.
 * @param {object} [options.existingFingerprint] Row to return from
 *   `findByFingerprint`, simulating a duplicate.
 * @param {object} [options.previousSighting] Row to return from
 *   `findPreviousSighting`, simulating earlier history for the subject.
 * @returns {object} A repository-shaped object.
 */
function createRepositoryStub({ existingFingerprint, previousSighting } = {}) {
  return {
    findByFingerprint: async () => existingFingerprint,
    findPreviousSighting: async () => previousSighting,
  };
}

/**
 * Builds a valid submission, overridden field by field per test.
 *
 * @param {object} [overrides={}] Fields to replace.
 * @returns {object} A payload shaped like a validated request body.
 */
function createSubmission(overrides = {}) {
  return {
    positionX: 500,
    positionY: 350,
    observedAt: new Date('2026-08-14T11:30:00.000Z'),
    confidence: 'medium',
    notes: 'Walking towards the park.',
    ...overrides,
  };
}

/**
 * Runs the pipeline with sensible defaults.
 *
 * @param {object} submission The payload to clean.
 * @param {object} [stubOptions={}] Options for the repository stub.
 * @returns {Promise<object>} The pipeline result.
 */
function run(submission, stubOptions = {}) {
  return createSightingPipeline().run(submission, {
    reporter: REPORTER,
    subjectId: SUBJECT_ID,
    sightingRepository: createRepositoryStub(stubOptions),
    now: NOW,
  });
}

describe('cleaning pipeline — the happy path', () => {
  it('accepts a well-formed sighting', async () => {
    const result = await run(createSubmission());

    assert.equal(result.status, 'accepted');
    assert.equal(result.warnings.length, 0);
    assert.equal(result.record.position_x, 500);
    assert.equal(result.record.position_y, 350);
  });

  it('derives the zone from the coordinates', async () => {
    const result = await run(createSubmission());

    assert.equal(result.record.zone_code, 'Z-ASSE');
  });

  it('attaches a fingerprint', async () => {
    const result = await run(createSubmission());

    assert.match(result.record.fingerprint, /^[0-9a-f]{64}$/u);
  });
});

describe('cleaning pipeline — sanitisation', () => {
  it('strips markup out of a note', async () => {
    const result = await run(
      createSubmission({ notes: 'Walking <script>alert(1)</script> past the bakery' }),
    );

    assert.equal(result.record.notes, 'Walking alert(1) past the bakery');
  });

  it('collapses stray whitespace and newlines', async () => {
    const result = await run(createSubmission({ notes: '  two\n\n  spaces   here  ' }));

    assert.equal(result.record.notes, 'two spaces here');
  });

  it('turns an absent note into null rather than an empty string', async () => {
    const result = await run(createSubmission({ notes: undefined }));

    assert.equal(result.record.notes, null);
  });

  it('refuses a note that is nothing but markup', async () => {
    await assert.rejects(
      () => run(createSubmission({ notes: '<div></div>' })),
      ValidationError,
    );
  });
});

describe('cleaning pipeline — temporal checks', () => {
  it('refuses a sighting in the future', async () => {
    await assert.rejects(
      () => run(createSubmission({ observedAt: new Date('2026-08-14T18:00:00.000Z') })),
      ValidationError,
    );
  });

  it('tolerates a clock that is a minute fast', async () => {
    const result = await run(
      createSubmission({ observedAt: new Date('2026-08-14T12:01:00.000Z') }),
    );

    assert.equal(result.status, 'accepted');
  });

  it('refuses a sighting older than thirty days', async () => {
    await assert.rejects(
      () => run(createSubmission({ observedAt: new Date('2026-06-01T12:00:00.000Z') })),
      ValidationError,
    );
  });

  it('warns about a report filed days after the fact', async () => {
    const result = await run(
      createSubmission({ observedAt: new Date('2026-08-10T12:00:00.000Z') }),
    );

    assert.equal(result.status, 'accepted');
    assert.ok(result.warnings.some((warning) => warning.code === 'late_report'));
  });
});

describe('cleaning pipeline — spatial checks', () => {
  it('refuses coordinates outside the neighbourhood', async () => {
    await assert.rejects(
      () => run(createSubmission({ positionX: 5000, positionY: 350 })),
      ValidationError,
    );
  });

  it('refuses negative coordinates', async () => {
    await assert.rejects(
      () => run(createSubmission({ positionX: -10, positionY: 350 })),
      ValidationError,
    );
  });
});

describe('cleaning pipeline — duplicate detection', () => {
  it('refuses a submission whose fingerprint already exists', async () => {
    await assert.rejects(
      () =>
        run(createSubmission(), {
          existingFingerprint: { id: 'existing-sighting-id' },
        }),
      ConflictError,
    );
  });
});

describe('cleaning pipeline — plausibility', () => {
  it('accepts movement at a walking pace', async () => {
    const result = await run(createSubmission(), {
      previousSighting: {
        id: 'previous',
        position_x: 400,
        position_y: 350,
        // 100 m earlier, five minutes ago: about 0.33 m/s.
        observed_at: new Date('2026-08-14T11:25:00.000Z'),
      },
    });

    assert.equal(result.status, 'accepted');
  });

  it('flags movement no pedestrian could manage', async () => {
    const result = await run(createSubmission(), {
      previousSighting: {
        id: 'previous',
        position_x: 20,
        position_y: 20,
        // ~580 m crossed in twenty seconds: roughly 29 m/s, or 105 km/h.
        observed_at: new Date('2026-08-14T11:29:40.000Z'),
      },
    });

    assert.equal(result.status, 'needs_review');
    assert.match(result.reviewReason, /implausible/iu);
    assert.ok(result.warnings.some((warning) => warning.code === 'implausible_movement'));
  });

  it('ignores tiny distances, where the speed figure is meaningless', async () => {
    const result = await run(createSubmission(), {
      previousSighting: {
        id: 'previous',
        position_x: 495,
        position_y: 348,
        // Five metres apart, one second later. Rounding noise, not teleporting.
        observed_at: new Date('2026-08-14T11:29:59.000Z'),
      },
    });

    assert.equal(result.status, 'accepted');
  });

  it('stores a flagged sighting rather than discarding it', async () => {
    const result = await run(createSubmission(), {
      previousSighting: {
        id: 'previous',
        position_x: 20,
        position_y: 20,
        observed_at: new Date('2026-08-14T11:29:40.000Z'),
      },
    });

    // The record is still complete and ready to be written.
    assert.equal(result.record.position_x, 500);
    assert.ok(result.record.fingerprint);
  });
});
