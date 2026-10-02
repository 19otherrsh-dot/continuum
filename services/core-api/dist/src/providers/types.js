/** Raised when a provider rejects our credentials, as opposed to failing transiently. */
export class ProviderAuthError extends Error {
    kind = 'auth';
    constructor(message) {
        super(message);
        this.name = 'ProviderAuthError';
    }
}
/** Raised on rate limits and outages — retried with backoff, never dropped. */
export class ProviderTransientError extends Error {
    retryAfterSeconds;
    kind = 'transient';
    constructor(message, retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
        this.name = 'ProviderTransientError';
    }
}
