/**
 * Async route wrapper.
 *
 * Pattern: Decorator, it wraps a handler and adds behaviour without the handler knowing about it.
 *
 * @param {(request: import('express').Request, response: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler} 
 */
export default function asyncHandler(handler) {
  return function wrappedHandler(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
