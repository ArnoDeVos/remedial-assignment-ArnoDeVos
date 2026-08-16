/**
 * Request schemas for sightings and subjects.
 * These schemas validate request shape and primitive values only. Checks that
 * require neighbourhood, database or sighting-history context belong to the cleaning pipeline.
 */

import { z } from 'zod';

import { BOUNDS } from '../../domain/neighbourhood.js';

/** A coordinate inside the neighbourhood rectangle. */
const coordinate = (axis, min, max) =>
  z.coerce
    .number({ invalid_type_error: `The ${axis} coordinate must be a number.` })
    .int(`The ${axis} coordinate must be a whole number.`)
    .min(min, `The ${axis} coordinate must be at least ${min}.`)
    .max(max, `The ${axis} coordinate must be at most ${max}.`);

/** An ISO-compatible timestamp coerced into a Date instance. */    
const timestamp = z.coerce.date({
  invalid_type_error: 'That is not a valid date and time.',
});

/** Request body for POST /api/sightings. */
export const createSightingSchema = z
  .object({
    // Either an existing subject  or enough detail to create a new one.
    subjectId: z.string().uuid('That is not a valid subject id.').optional(),
    newSubject: z
      .object({
        label: z
          .string()
          .trim()
          .min(3, 'Describe what you saw in at least three characters.')
          .max(120),
        description: z.string().trim().max(1000).optional(),
      })
      .optional(),

    positionX: coordinate('x', BOUNDS.minX, BOUNDS.maxX),
    positionY: coordinate('y', BOUNDS.minY, BOUNDS.maxY),
    observedAt: timestamp,
    confidence: z.enum(['low', 'medium', 'high']).default('medium'),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.subjectId) !== Boolean(value.newSubject), {
    message: 'Provide either an existing subjectId or details for a new subject, not both.',
    path: ['subjectId'],
  });

/** Query string of GET /api/sightings. */
export const listSightingsSchema = z.object({
  subjectId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  zoneCode: z.string().trim().max(32).optional(),
  status: z.enum(['accepted', 'needs_review', 'rejected']).optional(),
  from: timestamp.optional(),
  to: timestamp.optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

/** Query string of GET /api/subjects. */
export const listSubjectsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Query string of the trajectory and activity endpoints. */
export const timeWindowSchema = z.object({
  from: timestamp.optional(),
  to: timestamp.optional(),
});

/** Body of PATCH /api/sightings/:id/review. */
export const reviewSightingSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    invalid_type_error: 'A review resolves a sighting as accepted or rejected.',
  }),
  reason: z.string().trim().max(500).optional(),
});
