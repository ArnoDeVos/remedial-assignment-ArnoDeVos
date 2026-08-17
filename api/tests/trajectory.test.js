/**
 *Tests for the pure trajectory reconstruction helpers..
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import TrajectoryService from '../src/services/TrajectoryService.js';

/**
 * Create a repository-shaped sighting row.
 *
 * @param {string} id Sighting identifier.
 * @param {number} x Horizontal position in metres.
 * @param {number} y Vertical position in metres.
 * @param {string} observedAt Fixed ISO observation time.
 * @param {object} [extra={}] Extra columns.
 * @returns {object} A sighting row.
 */
function sighting(id, x, y, observedAt, extra = {}) {
  return {
    id,
    position_x: x,
    position_y: y,
    observed_at: observedAt,
    zone_code: 'Z-ASSE',
    reporter_id: 'reporter-1',
    ...extra,
  };
}

describe('buildSegments', () => {
  it('produces nothing for a single sighting', () => {
    const segments = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
    ]);

    assert.equal(segments.length, 0);
  });

  it('produces one segment per consecutive pair', () => {
    const segments = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z'),
      sighting('c', 200, 0, '2026-08-14T10:04:00.000Z'),
    ]);

    assert.equal(segments.length, 2);
    assert.equal(segments[0].fromSightingId, 'a');
    assert.equal(segments[1].toSightingId, 'c');
  });

  it('measures distance, duration and speed', () => {
    const [segment] = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 120, 0, '2026-08-14T10:01:00.000Z'),
    ]);

    assert.equal(segment.metres, 120);
    assert.equal(segment.seconds, 60);
    assert.equal(segment.speedMetresPerSecond, 2);
    assert.equal(segment.speedKilometresPerHour, 7.2);
  });

  it('marks a segment that implies an impossible speed', () => {
    const [segment] = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 900, 0, '2026-08-14T10:00:10.000Z'),
    ]);

    assert.equal(segment.isImplausible, true);
  });

  it('marks a long gap as the start of a new leg', () => {
    const [segment] = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-15T09:00:00.000Z'),
    ]);

    assert.equal(segment.startsNewLeg, true);
  });

  it('reports no speed when two sightings share a timestamp', () => {
    const [segment] = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-14T10:00:00.000Z'),
    ]);

    assert.equal(segment.speedMetresPerSecond, null);
    assert.equal(segment.isImplausible, true);
  });
});

describe('countLegs', () => {
  it('counts nothing when there are no segments', () => {
    assert.equal(TrajectoryService.countLegs([]), 0);
  });

  it('counts one leg for an unbroken path', () => {
    const segments = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z'),
      sighting('c', 200, 0, '2026-08-14T10:04:00.000Z'),
    ]);

    assert.equal(TrajectoryService.countLegs(segments), 1);
  });

  it('counts a second leg after an overnight gap', () => {
    const segments = TrajectoryService.buildSegments([
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z'),
      sighting('c', 120, 0, '2026-08-15T10:00:00.000Z'),
      sighting('d', 220, 0, '2026-08-15T10:02:00.000Z'),
    ]);

    assert.equal(TrajectoryService.countLegs(segments), 2);
  });
});

describe('summarise', () => {
  it('excludes overnight gaps from the distance travelled', () => {
    const sightings = [
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z'),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z'),
      sighting('c', 600, 0, '2026-08-15T10:00:00.000Z'),
      sighting('d', 700, 0, '2026-08-15T10:02:00.000Z'),
    ];

    const summary = TrajectoryService.summarise(
      sightings,
      TrajectoryService.buildSegments(sightings),
    );

    assert.equal(summary.totalMetres, 200);
    assert.equal(summary.sightingCount, 4);
  });

  it('lists each visited zone once', () => {
    const sightings = [
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z', { zone_code: 'Z-BEKKERZEEL' }),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z', { zone_code: 'Z-ASSE' }),
      sighting('c', 200, 0, '2026-08-14T10:04:00.000Z', { zone_code: 'Z-BEKKERZEEL' }),
    ];

    const summary = TrajectoryService.summarise(
      sightings,
      TrajectoryService.buildSegments(sightings),
    );

    assert.deepEqual([...summary.zonesVisited].sort(), ['Z-ASSE', 'Z-BEKKERZEEL']);
  });

  it('counts how many different residents reported the subject', () => {
    const sightings = [
      sighting('a', 0, 0, '2026-08-14T10:00:00.000Z', { reporter_id: 'r1' }),
      sighting('b', 100, 0, '2026-08-14T10:02:00.000Z', { reporter_id: 'r2' }),
      sighting('c', 200, 0, '2026-08-14T10:04:00.000Z', { reporter_id: 'r1' }),
    ];

    const summary = TrajectoryService.summarise(
      sightings,
      TrajectoryService.buildSegments(sightings),
    );

    assert.equal(summary.distinctReporters, 2);
  });

  it('handles an empty trajectory without throwing', () => {
    const summary = TrajectoryService.summarise([], []);

    assert.equal(summary.sightingCount, 0);
    assert.equal(summary.firstSeenAt, null);
    assert.equal(summary.averageSpeedMetresPerSecond, null);
  });
});
