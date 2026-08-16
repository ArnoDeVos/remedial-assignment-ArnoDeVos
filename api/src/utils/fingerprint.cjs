/**
 * Deterministic sighting fingerprints for database-level deduplication.
 *
 * Position and time bucketing lets small coordinate or timestamp differences
 * still identify the same observation. The resulting SHA-256 digest can be
 * stored in a UNIQUE database column so duplicate inserts are rejected.
 *
 */

const crypto = require('node:crypto');

/** Number of grid units represented by one position bucket. */
const POSITION_BUCKET_UNITS = 10;

/** Number of seconds represented by one time bucket. */
const TIME_BUCKET_SECONDS = 60;

/**
 * Builds the fingerprint for one sighting.
 *
 * @param {object} sighting Sighting values used to identify a submission.
 * @param {string} sighting.reporterId UUID of the resident submitting it.
 * @param {string} sighting.subjectId UUID of the observed subject.
 * @param {number} sighting.positionX Horizontal grid coordinate.
 * @param {number} sighting.positionY Vertical grid coordinate.
 * @param {Date|string} sighting.observedAt Observation date or date string.
 * @returns {string} Lowercase hexadecimal SHA-256 digest.
 */
function createFingerprint({ reporterId, subjectId, positionX, positionY, observedAt }) {
  const bucketedX = Math.round(positionX / POSITION_BUCKET_UNITS);
  const bucketedY = Math.round(positionY / POSITION_BUCKET_UNITS);
  const unixSeconds = Math.floor(new Date(observedAt).getTime() / 1000);
  const bucketedTime = Math.floor(unixSeconds / TIME_BUCKET_SECONDS);

  const material = [reporterId, subjectId, bucketedX, bucketedY, bucketedTime].join('|');

  return crypto.createHash('sha256').update(material).digest('hex');
}

module.exports = {
  createFingerprint,
  POSITION_BUCKET_UNITS,
  TIME_BUCKET_SECONDS,
};
