/**
 * Pure geometry utilities for the neighbourhood-monitoring API.
 *
 * Written as CommonJS on purpose. The rest of the API is ESM but Knex loads
 * seed files with "require" and those seeds need exactly these functions to
 * place simulated sightings in the right zone. ESM can import CommonJS without
 * trouble, so making this the CommonJS side of the boundary means the maths
 * exists once instead of twice.
 *
 */

/**
 * Determines whether a point lies within or on a rectangular boundary.
 *
 * @param {number} x Horizontal coordinate.
 * @param {number} y Vertical coordinate.
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} bounds Boundary rectangle.
 * @returns {boolean} Whether the point is within the boundary.
 */
function isWithinBounds(x, y, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

/**
 * Determines whether a point lies inside or on the edge of a simple polygon.
 *
 * Casts a ray to the right from the point and counts edge crossings; an odd
 * count means the point is inside. Works for any simple polygon, so zones are
 * not restricted to rectangles.
 *
 * @param {number} x Horizontal coordinate.
 * @param {number} y Vertical coordinate.
 * @param {Array<Array<number>>} polygon Ordered polygon vertices
 * @returns {boolean} Whether the point is inside the polygon.
 */
function isPointInPolygon(x, y, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [currentX, currentY] = polygon[i];
    const [previousX, previousY] = polygon[j];

    const crossesRay = currentY > y !== previousY > y;

    if (!crossesRay) {
      continue;
    }

    const intersectionX =
      ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;

    if (x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculates the vertex-average centre of a polygon.
 *
 * @param {Array<Array<number>>} polygon vertices.
 * @returns {{x: number, y: number}} Average horizontal and vertical coordinates.
 */
function polygonCentre(polygon) {
  const total = polygon.reduce(
    (accumulator, [x, y]) => ({ x: accumulator.x + x, y: accumulator.y + y }),
    { x: 0, y: 0 },
  );

  return { x: total.x / polygon.length, y: total.y / polygon.length };
}

/**
 * Resolves a coordinate to its containing or nearest zone.
 *
 * @param {number} x Horizontal coordinate.
 * @param {number} y Vertical coordinate.
 * @param {Array<{code: string, polygon: Array<Array<number>>}>} zones available zones.
 * @returns {object|null} The matching zone or when it is null there are no zones.
 */
function resolveZone(x, y, zones) {
  if (!Array.isArray(zones) || zones.length === 0) {
    return null;
  }

  const containing = zones.find((zone) => isPointInPolygon(x, y, zone.polygon));

  if (containing) {
    return containing;
  }

  return zones.reduce((closest, zone) => {
    const centre = polygonCentre(zone.polygon);
    const closestCentre = polygonCentre(closest.polygon);

    const distance = (x - centre.x) ** 2 + (y - centre.y) ** 2;
    const closestDistance = (x - closestCentre.x) ** 2 + (y - closestCentre.y) ** 2;

    return distance < closestDistance ? zone : closest;
  }, zones[0]);
}

/**
 * Calculates the Euclidean distance between two points.
 *
 * @param {{x: number, y: number}} from Starting point.
 * @param {{x: number, y: number}} to Ending point.
 * @returns {number} Distance between the points.
 */
function distanceBetween(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Calculates speed in metres per second.
 *
 * @param {number} metres Distance travelled in metres.
 * @param {number} seconds Duration in seconds.
 * @returns {number} Speed, zero at rest, or positive infinity for an invalid moving duration.
 */
function speedInMetresPerSecond(metres, seconds) {
  if (seconds <= 0) {
    return metres === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return metres / seconds;
}

/**
 * Rounds a finite number to the requested decimal precision.
 *
 * @param {number} value Number to round.
 * @param {number} [decimals=2] Decimals to keep.
 * @returns {number} The rounded value.
 */
function round(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return value;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

module.exports = {
  isWithinBounds,
  isPointInPolygon,
  polygonCentre,
  resolveZone,
  distanceBetween,
  speedInMetresPerSecond,
  round,
};
