/**
 * Authentication middleware.
 * Factory patern
 */

import { AuthenticationError, AuthorisationError } from '../errors/ApplicationError.js';

/**
 * Extracts a bearer token from the Authorization header.
 *
 * @param {import('express').Request} request Incoming request.
 * @returns {string|null} The token or null when the header is absent or
 *   malformed.
 */
function extractBearerToken(request) {
  const header = request.get('authorization');

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

/**
 * Builds middleware that requires a valid token.
 *
 * @param {import('../services/AuthService.js').default} authService Service used to verify the token.
 * @returns {import('express').RequestHandler} The configured middleware.
 */
export function requireAuthentication(authService) {
  return async function authenticate(request, response, next) {
    try {
      const token = extractBearerToken(request);

      if (!token) {
        throw new AuthenticationError('Sign in to do that.');
      }

      request.resident = await authService.resolveResidentFromToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Builds middleware that reads a token when one is present.
 *
 * @param {import('../services/AuthService.js').default} authService Service
 *   used to verify the token.
 * @returns {import('express').RequestHandler} The configured middleware.
 */
export function attachResidentIfPresent(authService) {
  return async function attachResident(request, response, next) {
    const token = extractBearerToken(request);

    if (!token) {
      next();
      return;
    }

    try {
      request.resident = await authService.resolveResidentFromToken(token);
    } catch {
      request.resident = undefined;
    }

    next();
  };
}

/**
 * Builds middleware that requires a specific role.
 *
 * Must run after {@link requireAuthentication}.
 *
 * @param {...string} roles Roles that are allowed through.
 * @returns {import('express').RequestHandler} The configured middleware.
 */
export function requireRole(...roles) {
  return function authorise(request, response, next) {
    if (!request.resident) {
      next(new AuthenticationError('Sign in to do that.'));
      return;
    }

    if (!roles.includes(request.resident.role)) {
      next(new AuthorisationError('Your account does not have access to that.'));
      return;
    }

    next();
  };
}
