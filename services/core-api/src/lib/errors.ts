/**
 * Application errors carry a stable machine-readable `code` alongside the HTTP
 * status, so clients can branch on the failure without string-matching prose.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have permission to do that') =>
  new AppError(403, 'forbidden', message);

export const notFound = (what = 'Record') => new AppError(404, 'not_found', `${what} not found`);

/**
 * 409 is used where the request is well-formed but conflicts with current
 * state — e.g. converting a deal that already has a project, which must fail
 * with a pointer to the existing project rather than creating a duplicate.
 */
export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'conflict', message, details);

export const rateLimited = (message = 'Rate limit exceeded') =>
  new AppError(429, 'rate_limited', message);

export const serverError = (message = 'Something went wrong') =>
  new AppError(500, 'internal_error', message);
