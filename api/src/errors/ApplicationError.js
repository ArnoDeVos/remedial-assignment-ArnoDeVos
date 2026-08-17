/**
 * Application error handling.
 *
 */

export class ApplicationError extends Error {
  /**
   * @param {string} message Human readable description.
   * @param {number} [statusCode=500] HTTP status the client should receive.
   * @param {object} [details] Optional structured detail, e.g. field errors.
   */
  constructor(message, statusCode = 500, details = undefined) {
    super(message);

    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, new.target);
  }
}

/** The request body or query string did not pass validation. */
export class ValidationError extends ApplicationError {
  /**
   * @param {string} message Human readable description.
   * @param {object} [details] Field-level problems, keyed by field name.
   */
  constructor(message, details) {
    super(message, 422, details);
  }
}

/** No credentials, or credentials that do not check out. */
export class AuthenticationError extends ApplicationError {
  /**
   * @param {string} [message='Authentication required.'] Human readable description.
   */
  constructor(message = 'Authentication required.') {
    super(message, 401);
  }
}

/** Valid credentials, but not enough rights for this particular action. */
export class AuthorisationError extends ApplicationError {
  /**
   * @param {string} [message='You are not allowed to perform this action.'] Description.
   */
  constructor(message = 'You are not allowed to perform this action.') {
    super(message, 403);
  }
}

/** The addressed resource does not exist. */
export class NotFoundError extends ApplicationError {
  /**
   * @param {string} [resource='Resource'] What was being looked for.
   */
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404);
  }
}

/** The request conflicts with the current state, e.g. a duplicate. */
export class ConflictError extends ApplicationError {
  /**
   * @param {string} message Human readable description.
   * @param {object} [details] Optional structured detail.
   */
  constructor(message, details) {
    super(message, 409, details);
  }
}
