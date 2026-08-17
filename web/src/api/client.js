/**
 * Central HTTP client for the frontend API.
 *
 * Keeping all requests here ensures authentication, JSON handling and error
 * responses behave consistently throughout the application. 
 */

const BASE_PATH = '/api';

/** Where the session token is kept between page loads. */
const TOKEN_STORAGE_KEY = 'buurtwacht.token';

/** Error returned for an unsuccessful API response. */
export class ApiError extends Error {
  /**
   * @param {string} message Human readable message.
   * @param {number} status HTTP response status
   * @param {object} [details] Structured field errors.
   */
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;
  }
}

/**
 * Read the persisted authentication token without exposing storage errors.
 *
 * @returns {string|null} The token or null when signed out.
 */
export function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Stores a token or removes it when an empty value is supplied.
 *
 * @param {string|null} token The token to keep or null to sign out.
 * @returns {void}
 */
export function writeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable in restricted browser modes.
  }
}

/**
 * Convert request parameters into a URL query string.
 *
 * @param {object} [params={}] Query parameters.
 * @returns {string} A query string starting with "?" or an empty string.
 */
export function toQueryString(params = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    search.set(key, value instanceof Date ? value.toISOString() : String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Send a request to the backend and return its decoded JSON response.
 *
 * @param {string} path Path relative to `/api`.
 * @param {object} [options={}] Request options.
 * @param {string} [options.method='GET'] HTTP method.
 * @param {object} [options.body] JSON body to send.
 * @param {object} [options.params] Query parameters.
 * @param {AbortSignal} [options.signal] Signal used to cancel the request.
 * @returns {Promise<object>} The parsed response body.
 * @throws {ApiError} When the backend returns a non-success status.
 */
export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const token = readToken();

  const response = await fetch(`${BASE_PATH}${path}${toQueryString(params)}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'The server could not handle that request.',
      response.status,
      payload?.error?.details,
    );
  }

  return payload;
}

/**
 * The API surface, grouped the way the server groups it.
 *
 * Naming every endpoint here means a component asks for `api.subjects.trajectory(id)`
 * rather than assembling a URL, so a route change is a one-line edit.
 */
const api = {
  auth: {
    /**
     * @param {object} credentials E-mail and password.
     * @returns {Promise<{resident: object, token: string}>} Session details.
     */
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),

    /**
     * @param {object} details Registration details.
     * @returns {Promise<{resident: object, token: string}>} Session details.
     */
    register: (details) => request('/auth/register', { method: 'POST', body: details }),

    /**
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{resident: object}>} The signed-in resident.
     */
    me: (signal) => request('/auth/me', { signal }),
  },

  neighbourhood: {
    /**
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{map: object}>} Bounds, zones and streets.
     */
    map: (signal) => request('/neighbourhood/map', { signal }),

    /**
     * @param {object} [params] Time window.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{activity: object}>} Aggregated activity.
     */
    activity: (params, signal) => request('/neighbourhood/activity', { params, signal }),

    /**
     * @param {Array<string>} subjectIds Subjects to include.
     * @param {object} [params] Time window.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{trajectories: Array<object>}>} Batched trajectories.
     */
    trajectories: (subjectIds, params, signal) =>
      request('/neighbourhood/trajectories', {
        params: { ...params, subjectIds: subjectIds.join(',') },
        signal,
      }),
  },

  subjects: {
    /**
     * @param {object} [params] Search and limit.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{subjects: Array<object>}>} Matching subjects.
     */
    list: (params, signal) => request('/subjects', { params, signal }),

    /**
     * @param {string} id Subject id.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{subject: object}>} The subject.
     */
    get: (id, signal) => request(`/subjects/${id}`, { signal }),

    /**
     * @param {string} id Subject id.
     * @param {object} [params] Time window.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{trajectory: object}>} The reconstructed trajectory.
     */
    trajectory: (id, params, signal) =>
      request(`/subjects/${id}/trajectory`, { params, signal }),
  },

  sightings: {
    /**
     * @param {object} [params] Filters.
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{sightings: Array<object>}>} Matching sightings.
     */
    list: (params, signal) => request('/sightings', { params, signal }),

    /**
     * @param {object} sighting The sighting to register.
     * @returns {Promise<{sighting: object, warnings: Array<object>}>} The result.
     */
    create: (sighting) => request('/sightings', { method: 'POST', body: sighting }),

    /**
     * @param {AbortSignal} [signal] Cancellation signal.
     * @returns {Promise<{sightings: Array<object>}>} Sightings needing review.
     */
    reviewQueue: (signal) => request('/sightings/review-queue', { signal }),

    /**
     * @param {string} id Sighting id.
     * @param {object} decision Status and reason.
     * @returns {Promise<{sighting: object}>} The updated sighting.
     */
    review: (id, decision) =>
      request(`/sightings/${id}/review`, { method: 'PATCH', body: decision }),
  },
};

export default api;
