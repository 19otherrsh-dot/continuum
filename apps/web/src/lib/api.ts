const TOKEN_KEY = 'continuum.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? (method === 'GET' ? undefined : '{}') : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = (payload as { error?: { code: string; message: string; details?: unknown } })
      .error;
    // A 401 means the session is gone; clearing the token sends the user back
    // to the login screen rather than leaving them on a broken page.
    if (response.status === 401) setToken(null);
    throw new ApiError(
      response.status,
      error?.code ?? 'unknown',
      error?.message ?? 'Request failed',
      error?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Opens the notification stream. The token rides in the query string because
 *  EventSource cannot set an Authorization header. */
export function openEventStream(onEvent: (type: string, data: unknown) => void): () => void {
  const token = getToken();
  if (!token) return () => undefined;

  const source = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`);
  const handler = (event: MessageEvent) => {
    try {
      onEvent('notification', JSON.parse(event.data));
    } catch {
      /* ignore malformed frames */
    }
  };
  source.addEventListener('notification', handler as EventListener);

  return () => {
    source.removeEventListener('notification', handler as EventListener);
    source.close();
  };
}
