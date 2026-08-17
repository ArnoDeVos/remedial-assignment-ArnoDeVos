/**
 * Colour helpers for the map.
 */

const TRAJECTORY_COLOURS = [
  '#4dabf7',
  '#f783ac',
  '#ffd43b',
  '#69db7c',
  '#e599f7',
  '#ff922b',
  '#66d9e8',
  '#ffa8a8',
];

/**
 *  Returns a stable trajectory colour for a complete subject identifier.
 *
 * @param {string} subjectId The subject's complete identifier.
 * @returns {string} A hex colour from the trajectory palette.
 */
export function colourForSubject(subjectId) {
  let hash = 0;

  for (let index = 0; index < subjectId.length; index += 1) {
    hash = (hash * 31 + subjectId.charCodeAt(index)) % 100_000;
  }

  return TRAJECTORY_COLOURS[hash % TRAJECTORY_COLOURS.length];
}

/**
 * Converts normalised zone activity into a visible fill colour.
 *
 * @param {number} intensity A normalised activity value, normally from 0 to 1.
 * @returns {string} colour with activity-based opacity.
 */
export function zoneFillForIntensity(intensity) {
  const alpha = 0.08 + Math.min(Math.max(intensity, 0), 1) * 0.42;
  return `rgba(77, 171, 247, ${alpha.toFixed(3)})`;
}

/**
 * Returns the map-marker radius associated with a confidence level.
 *
 * @param {'low'|'medium'|'high'} confidence The confidence classification.
 * @returns {number} The marker radius in SVG units.
 */
export function radiusForConfidence(confidence) {
  return { low: 4, medium: 6, high: 8 }[confidence] ?? 6;
}

export default TRAJECTORY_COLOURS;
