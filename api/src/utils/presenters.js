/**
 * Presenters form the boundary between PostgreSQL rows and API responses.
 *
 * They follow the Data Transfer Object pattern so database schema changes do
 * not silently alter the public API or expose private database fields.
 *
 */

/**
 * Converts a resident row to its public API representation.
 *
 * @param {object} resident PostgreSQL resident row.
 * @returns {object|null} Public resident data, or null when missing.
 */
export function presentResident(resident) {
  if (!resident) {
    return null;
  }

  return {
    id: resident.id,
    email: resident.email,
    displayName: resident.display_name,
    homeZoneCode: resident.home_zone_code ?? null,
    role: resident.role,
    createdAt: resident.created_at,
    ...(resident.sighting_count === undefined
      ? {}
      : { sightingCount: Number(resident.sighting_count) }),
  };
}

/**
 * Converts a subject row to its public API representation.
 *
 * @param {object} subject PostgreSQL subject row.
 * @returns {object|null} Public subject data, or null when missing.
 */
export function presentSubject(subject) {
  if (!subject) {
    return null;
  }

  return {
    id: subject.id,
    referenceCode: subject.reference_code,
    label: subject.label,
    description: subject.description ?? null,
    firstSeenAt: subject.first_seen_at ?? null,
    lastSeenAt: subject.last_seen_at ?? null,
    sightingCount: Number(subject.sighting_count ?? 0),
  };
}

/**
 * Converts a sighting row, including optional joined fields, to its public API
 * representation.
 *
 * @param {object} sighting PostgreSQL sighting row.
 *   with subject and reporter labels.
 * @returns {object|null} Public sighting data, or null when missing.
 */
export function presentSighting(sighting) {
  if (!sighting) {
    return null;
  }

  return {
    id: sighting.id,
    subjectId: sighting.subject_id,
    subjectReferenceCode: sighting.subject_reference_code ?? null,
    subjectLabel: sighting.subject_label ?? null,
    reporterId: sighting.reporter_id,
    reporterName: sighting.reporter_name ?? null,
    position: { x: sighting.position_x, y: sighting.position_y },
    zoneCode: sighting.zone_code ?? null,
    observedAt: sighting.observed_at,
    confidence: sighting.confidence,
    status: sighting.status,
    reviewReason: sighting.review_reason ?? null,
    notes: sighting.notes ?? null,
    createdAt: sighting.created_at,
  };
}

/**
 * Converts a zone row to its public map representation.
 *
 * @param {object} zone PostgreSQL zone row with a JSONB or JSON-string polygon.
 * @returns {object} Public zone data.
 */
export function presentZone(zone) {
  return {
    code: zone.code,
    name: zone.name,
    description: zone.description ?? null,
    polygon: typeof zone.polygon === 'string' ? JSON.parse(zone.polygon) : zone.polygon,
  };
}

/**
 * Converts a street row to its public map representation.
 *
 * @param {object} street PostgreSQL street row with a JSONB or JSON-string path.
 * @returns {object} Public street data.
 */
export function presentStreet(street) {
  return {
    name: street.name,
    path: typeof street.path === 'string' ? JSON.parse(street.path) : street.path,
  };
}
