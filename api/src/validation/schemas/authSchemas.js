/**
 * Request schemas for the authentication endpoints.
 *
 */

import { z } from 'zod';

const zoneCode = z
  .string()
  .trim()
  .regex(/^[A-Z0-9-]{2,32}$/u, 'A zone code contains only capitals, digits and dashes.');

const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'That password is unreasonably long.')
  .regex(/[a-z]/u, 'Include at least one lower-case letter.')
  .regex(/[A-Z]/u, 'Include at least one capital letter.')
  .regex(/[0-9]/u, 'Include at least one digit.');

/** Body of POST /api/auth/register. */
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('That does not look like an e-mail address.')
    .max(254),
  displayName: z
    .string()
    .trim()
    .min(2, 'A display name needs at least two characters.')
    .max(80),
  password,
  homeZoneCode: zoneCode.optional(),
});

/** Body of POST /api/auth/login. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like an e-mail address.'),
  password: z.string().min(1, 'A password is required.'),
});
