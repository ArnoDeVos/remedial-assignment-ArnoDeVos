/**
 * Tests for sighting fingerprints.
 *
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { createFingerprint } = require('../src/utils/fingerprint.cjs');

const BASE = Object.freeze({
  reporterId: '11111111-1111-4111-8111-111111111111',
  subjectId: '22222222-2222-4222-8222-222222222222',
  positionX: 500,
  positionY: 350,
  observedAt: new Date('2026-08-14T10:00:00.000Z'),
});

describe('createFingerprint', () => {
  it('is deterministic', () => {
    assert.equal(createFingerprint(BASE), createFingerprint({ ...BASE }));
  });

  it('produces a 64-character hex digest', () => {
    assert.match(createFingerprint(BASE), /^[0-9a-f]{64}$/u);
  });

  it('treats a different reporter as a different sighting', () => {
    const other = createFingerprint({
      ...BASE,
      reporterId: '33333333-3333-4333-8333-333333333333',
    });

    assert.notEqual(createFingerprint(BASE), other);
  });

  it('treats a different subject as a different sighting', () => {
    const other = createFingerprint({
      ...BASE,
      subjectId: '44444444-4444-4444-8444-444444444444',
    });

    assert.notEqual(createFingerprint(BASE), other);
  });

  it('collapses positions within the same 10-unit bucket', () => {
    // The double-tap case: the same report, a couple of metres apart.
    const nudged = createFingerprint({ ...BASE, positionX: 502, positionY: 351 });

    assert.equal(createFingerprint(BASE), nudged);
  });

  it('separates positions in different buckets', () => {
    const elsewhere = createFingerprint({ ...BASE, positionX: 560 });

    assert.notEqual(createFingerprint(BASE), elsewhere);
  });

  it('collapses timestamps within the same minute', () => {
    const seconds = createFingerprint({
      ...BASE,
      observedAt: new Date('2026-08-14T10:00:41.000Z'),
    });

    assert.equal(createFingerprint(BASE), seconds);
  });

  it('separates timestamps in different minutes', () => {
    const later = createFingerprint({
      ...BASE,
      observedAt: new Date('2026-08-14T10:05:00.000Z'),
    });

    assert.notEqual(createFingerprint(BASE), later);
  });

  it('accepts an ISO string as readily as a Date', () => {
    const fromString = createFingerprint({
      ...BASE,
      observedAt: '2026-08-14T10:00:00.000Z',
    });

    assert.equal(createFingerprint(BASE), fromString);
  });
});
