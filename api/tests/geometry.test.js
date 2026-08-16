/**
 * Test for the neighbourhood geometry.
 *
 * Runs with "npm test"
 *
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BOUNDS,
  ZONES,
  distanceInMetres,
  isWithinBounds,
  resolveZone,
  speedInMetresPerSecond,
} from '../src/domain/neighbourhood.js';

describe('isWithinBounds', () => {
  it('accepts a point in the middle of the map', () => {
    assert.equal(isWithinBounds(500, 350), true);
  });

  it('accepts the corners, which are on the boundary', () => {
    assert.equal(isWithinBounds(BOUNDS.minX, BOUNDS.minY), true);
    assert.equal(isWithinBounds(BOUNDS.maxX, BOUNDS.maxY), true);
  });

  it('rejects points outside the rectangle', () => {
    assert.equal(isWithinBounds(-1, 350), false);
    assert.equal(isWithinBounds(500, BOUNDS.maxY + 1), false);
  });
});

describe('resolveZone', () => {
  it('returns null for a point off the map', () => {
    assert.equal(resolveZone(-50, -50), null);
  });

  it('places a point in the zone whose polygon contains it', () => {
    assert.equal(resolveZone(500, 350).code, 'Z-ASSE');
  });

  it('still resolves a point sitting exactly on a zone border', () => {
    const zone = resolveZone(500, 250);

    assert.notEqual(zone, null);
    assert.ok(ZONES.some((candidate) => candidate.code === zone.code));
  });

  it('covers the whole map: no point resolves to nothing', () => {
    for (let x = 0; x <= BOUNDS.maxX; x += 50) {
      for (let y = 0; y <= BOUNDS.maxY; y += 50) {
        assert.notEqual(resolveZone(x, y), null, `no zone found for (${x}, ${y})`);
      }
    }
  });
});

describe('distanceInMetres', () => {
  it('measures a straight line', () => {
    assert.equal(distanceInMetres({ x: 0, y: 0 }, { x: 300, y: 400 }), 500);
  });

  it('is zero for a point against itself', () => {
    assert.equal(distanceInMetres({ x: 12, y: 34 }, { x: 12, y: 34 }), 0);
  });
});

describe('speedInMetresPerSecond', () => {
  it('divides distance by time', () => {
    assert.equal(speedInMetresPerSecond(100, 50), 2);
  });

  it('treats movement in no time as infinitely fast', () => {
    assert.equal(speedInMetresPerSecond(100, 0), Number.POSITIVE_INFINITY);
  });

  it('treats standing still in no time as not moving', () => {
    assert.equal(speedInMetresPerSecond(0, 0), 0);
  });
});
