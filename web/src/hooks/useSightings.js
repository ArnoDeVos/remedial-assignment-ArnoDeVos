/**
 * Hooks for sightings and subjects.
 */

import api from '../api/client.js';
import useApiResource from './useApiResource.js';

/**
 * Loads sightings matching a filter set.
 *
 * @param {object} filters Filters accepted by GET /api/sightings.
 * @returns {{data: Array<object>, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   Matching sightings, newest first.
 */
export function useSightings(filters) {
  return useApiResource(
    async (signal) => (await api.sightings.list(filters, signal)).sightings,
    [filters.from, filters.to, filters.zoneCode, filters.subjectId, filters.limit],
    { initialData: [] },
  );
}

/**
 * Loads the subject list.
 *
 * @param {{search?: string}} [filters={}] Optional search term.
 * @returns {{data: Array<object>, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   Subjects, most recently seen first.
 */
export function useSubjects(filters = {}) {
  return useApiResource(
    async (signal) => (await api.subjects.list(filters, signal)).subjects,
    [filters.search],
    { initialData: [] },
  );
}

/**
 * Loads one subject's reconstructed trajectory.
 *
 * @param {string|null} subjectId Subject to reconstruct, or null to skip.
 * @param {{from?: string, to?: string}} window Time window.
 * @returns {{data: object|null, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   The trajectory with its segments and statistics.
 */
export function useTrajectory(subjectId, window) {
  return useApiResource(
    async (signal) => (await api.subjects.trajectory(subjectId, window, signal)).trajectory,
    [subjectId, window.from, window.to],
    { enabled: Boolean(subjectId) },
  );
}

/**
 * Loads the moderation queue.
 *
 * @param {boolean} enabled Whether the current resident may see it.
 * @returns {{data: Array<object>, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   Sightings the cleaning pipeline flagged.
 */
export function useReviewQueue(enabled) {
  return useApiResource(
    async (signal) => (await api.sightings.reviewQueue(signal)).sightings,
    [],
    { enabled, initialData: [] },
  );
}
