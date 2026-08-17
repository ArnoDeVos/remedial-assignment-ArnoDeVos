/**
 * Hooks for the neighbourhood map and its activity figures.
 *
 * Thin wrappers around {@link useApiResource}.
 */

import api from '../api/client.js';
import useApiResource from './useApiResource.js';

/**
 * Loads the map geometry.
 * Fetched once per session: zones and streets only change when the database is
 * reseeded.
 *
 * @returns {{data: object|null, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   The map, or the state of loading it.
 */
export function useNeighbourhoodMap() {
  return useApiResource(
    async (signal) => (await api.neighbourhood.map(signal)).map,
    [],
  );
}

/**
 * Loads activity figures for a time window.
 *
 * @param {{from?: string, to?: string}} window Time window to aggregate over.
 * @returns {{data: object|null, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   Zone intensities, hourly distribution, summary and contributors.
 */
export function useNeighbourhoodActivity(window) {
  return useApiResource(
    async (signal) => (await api.neighbourhood.activity(window, signal)).activity,
    [window.from, window.to],
  );
}

/**
 * Loads trajectories for several subjects at once.
 *
 * @param {Array<string>} subjectIds Subjects to include; an empty array skips
 *   the request entirely.
 * @param {{from?: string, to?: string}} window Time window.
 * @returns {{data: Array<object>, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   One trajectory per subject with at least two sightings.
 */
export function useTrajectories(subjectIds, window) {
  return useApiResource(
    async (signal) =>
      (await api.neighbourhood.trajectories(subjectIds, window, signal)).trajectories,
    [subjectIds.join(','), window.from, window.to],
    { enabled: subjectIds.length > 0, initialData: [] },
  );
}
