/**
 * Generic data-fetching hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetches data from the API and keeps it in component state.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} fetcher Function performing the
 *   request. Must forward the signal so cancellation works.
 * @param {Array<unknown>} dependencies Values that should trigger a refetch,
 *   exactly like a `useEffect` dependency array.
 * @param {object} [options={}] Extra options.
 * @param {boolean} [options.enabled=true] Skip fetching while false.
 * @param {T} [options.initialData=null] Value to use before the first response.
 * @returns {{data: T, error: Error|null, isLoading: boolean, refetch: () => void}}
 *   The current state of the request.
 */
export default function useApiResource(fetcher, dependencies, options = {}) {
  const { enabled = true, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [reloadCount, setReloadCount] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let isCurrent = true;

    setIsLoading(true);
    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (isCurrent) {
          setData(result);
        }
      })
      .catch((caught) => {
        if (isCurrent && caught.name !== 'AbortError') {
          setError(caught);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [...dependencies, enabled, reloadCount]);

  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  return { data, error, isLoading, refetch };
}
