/**
 * Neighbourhood service.
 * Serves the map geometry and the activity figures layered on top of it.
 */

import { presentStreet, presentZone } from '../utils/presenters.js';
import { BOUNDS, NAME } from '../domain/neighbourhood.js';

export default class NeighbourhoodService {
  /**
   * @param {object} dependencies Injected collaborators.
   * @param {import('../repositories/NeighbourhoodRepository.js').default} dependencies.neighbourhoodRepository
   *   Access to zones and streets.
   * @param {import('../repositories/SightingRepository.js').default} dependencies.sightingRepository
   *   Access to sightings, for the aggregates.
   * @param {import('../repositories/ResidentRepository.js').default} dependencies.residentRepository
   *   Access to residents, for the contributor ranking.
   */
  constructor({ neighbourhoodRepository, sightingRepository, residentRepository }) {
    this.neighbourhoodRepository = neighbourhoodRepository;
    this.sightingRepository = sightingRepository;
    this.residentRepository = residentRepository;
  }

  /**
   * Returns the map: bounds, zones and streets.
   *
   * @returns {Promise<{name: string, bounds: object, zones: Array<object>, streets: Array<object>}>}
   *   Everything the client needs to draw an empty neighbourhood.
   */
  async getMap() {
    const { zones, streets } = await this.neighbourhoodRepository.findMap();

    return {
      name: NAME,
      bounds: BOUNDS,
      zones: zones.map(presentZone),
      streets: streets.map(presentStreet),
    };
  }

  /**
   * Returns activity statistics for a time window.
   *
   * @param {object} [filters={}] Optional time window.
   * @param {Date} [filters.from] Earliest observation to count.
   * @param {Date} [filters.to] Latest observation to count.
   * @returns {Promise<object>} Zone activity, hourly distribution, headline
   *   figures and the most active reporters.
   */
  async getActivity(filters = {}) {
    const [{ zones }, zoneCounts, hourly, summary, contributors] = await Promise.all([
      this.neighbourhoodRepository.findMap(),
      this.sightingRepository.countByZone(filters),
      this.sightingRepository.countByHourOfDay(filters),
      this.sightingRepository.summarise(filters),
      this.residentRepository.findMostActive(5),
    ]);

    const countsByZone = new Map(zoneCounts.map((row) => [row.zone_code, row]));
    const busiest = Math.max(1, ...zoneCounts.map((row) => row.sighting_count));

    const zoneActivity = zones.map((zone) => {
      const counts = countsByZone.get(zone.code);
      const sightingCount = counts?.sighting_count ?? 0;

      return {
        zoneCode: zone.code,
        zoneName: zone.name,
        sightingCount,
        subjectCount: counts?.subject_count ?? 0,
        // Relative to the busiest zone in the same window, so the map stays
        // readable whether the window holds ten sightings or hundreds.
        intensity: Math.round((sightingCount / busiest) * 100) / 100,
      };
    });

    return {
      window: {
        from: filters.from ?? null,
        to: filters.to ?? null,
      },
      summary,
      zones: zoneActivity.sort((left, right) => right.sightingCount - left.sightingCount),
      hourly: NeighbourhoodService.fillMissingHours(hourly),
      contributors: contributors.map((resident) => ({
        id: resident.id,
        displayName: resident.display_name,
        homeZoneCode: resident.home_zone_code ?? null,
        sightingCount: resident.sighting_count,
      })),
    };
  }

  /**
   * Pads an hourly distribution so all 24 hours are present.
   *
   * @param {Array<{hour: number, sighting_count: number}>} rows Rows from the
   *   database, one per hour that had activity.
   * @returns {Array<{hour: number, sightingCount: number}>} All 24 hours.
   */
  static fillMissingHours(rows) {
    const byHour = new Map(rows.map((row) => [row.hour, row.sighting_count]));

    return Array.from({ length: 24 }, (unused, hour) => ({
      hour,
      sightingCount: byHour.get(hour) ?? 0,
    }));
  }
}
