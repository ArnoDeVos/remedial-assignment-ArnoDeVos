/**
 * Authentication controller.
 *
 */

import asyncHandler from '../utils/asyncHandler.js';
import { presentResident } from '../utils/presenters.js';

/**
 *
 * @param {import('../services/AuthService.js').default} authService 
 * @returns {{register: import('express').RequestHandler, login: import('express').RequestHandler, me: import('express').RequestHandler}}
 *   The handlers.
 */
export default function createAuthController(authService) {
  return {
    /** POST /api/auth/register */
    register: asyncHandler(async (request, response) => {
      const result = await authService.register(request.validated);
      response.status(201).json(result);
    }),

    /** POST /api/auth/login */
    login: asyncHandler(async (request, response) => {
      const result = await authService.login(request.validated);
      response.status(200).json(result);
    }),

    /** GET /api/auth/me */
    me: asyncHandler(async (request, response) => {
      response.status(200).json({ resident: presentResident(request.resident) });
    }),
  };
}
