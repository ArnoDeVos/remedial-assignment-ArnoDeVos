/**
 * Neighbourhood geometry
 *
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {{name: string, description: string, bounds: object, metresPerUnit: number, zones: Array, streets: Array}} */
const neighbourhood = require('./neighbourhood.json');
const geometry = require('./geometry.cjs');

export const NAME = neighbourhood.name;
export const BOUNDS = Object.freeze(neighbourhood.bounds);
export const METRES_PER_UNIT = neighbourhood.metresPerUnit;
export const ZONES = Object.freeze(neighbourhood.zones);
export const STREETS = Object.freeze(neighbourhood.streets);

/**
 * Tests whether a coordinate falls inside the neighbourhood.
 *
 * @param {number} x Horizontal grid coordinate.
 * @param {number} y Vertical grid coordinate.
 * @returns {boolean} True when the point is on the map.
 */
export function isWithinBounds(x, y) {
  return geometry.isWithinBounds(x, y, BOUNDS);
}

/**
 * Finds the zone a coordinate belongs to.
 *
 * @param {number} x Horizontal grid coordinate.
 * @param {number} y Vertical grid coordinate.
 * @returns {{code: string, name: string}|null} The matching zone or null when it lies outside the neighbourhood.
 */
export function resolveZone(x, y) {
  if (!isWithinBounds(x, y)) {
    return null;
  }

  return geometry.resolveZone(x, y, ZONES);
}

/**
 * Distance between two grid points, expressed in metres.
 *
 * @param {{x: number, y: number}} from Start point.
 * @param {{x: number, y: number}} to End point.
 * @returns {number} Distance in metres.
 */
export function distanceInMetres(from, to) {
  return geometry.distanceBetween(from, to) * METRES_PER_UNIT;
}

export const { distanceBetween, speedInMetresPerSecond, round } = geometry;

export default neighbourhood;
