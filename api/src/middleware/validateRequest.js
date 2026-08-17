/**
 * Schema validation middleware.
 *
 * Factory patern
 */

import { ValidationError } from '../errors/ApplicationError.js';

/**
 *
 * @param {import('zod').ZodError} error The validation failure.
 * @returns {Record<string, string>} One message per offending field.
 */
function toFieldErrors(error) {
  return error.issues.reduce((fields, issue) => {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'request';

    // Keep the first message per field: the first is usually the most specific.
    if (!(key in fields)) {
      fields[key] = issue.message;
    }

    return fields;
  }, {});
}

/**
 * Builds a middleware that validates one part of the request.
 *
 * @param {import('zod').ZodSchema} schema Schema the input must satisfy.
 * @param {'body'|'query'|'params'} [source='body'] Which part to validate.
 * @returns {import('express').RequestHandler} The configured middleware.
 */
export default function validateRequest(schema, source = 'body') {
  return function validate(request, response, next) {
    const result = schema.safeParse(request[source]);

    if (!result.success) {
      next(
        new ValidationError(
          'The request did not pass validation.',
          toFieldErrors(result.error),
        ),
      );
      return;
    }

    request.validated = { ...(request.validated ?? {}), ...result.data };
    next();
  };
}
