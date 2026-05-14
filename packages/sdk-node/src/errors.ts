import type { ApiErrorBody } from '@agent-killswitch/shared-types';

export type ParsedApiError = Pick<ApiErrorBody, 'code' | 'message' | 'details'>;

function detailToMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (typeof e === 'object' && e && 'msg' in e ? String((e as { msg: unknown }).msg) : String(e)))
      .join('; ');
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }
  return JSON.stringify(detail);
}

export async function parseErrorBody(res: Response): Promise<ParsedApiError> {
  const raw = await res.text();
  if (!raw) {
    return { code: `http_${res.status}`, message: res.statusText || `HTTP ${res.status}` };
  }
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (typeof body.message === 'string') {
      return {
        code: typeof body.code === 'string' ? body.code : `http_${res.status}`,
        message: body.message,
        details: body.details as Record<string, unknown> | undefined,
      };
    }
    if ('detail' in body) {
      return { code: `http_${res.status}`, message: detailToMessage(body.detail) };
    }
    return { code: `http_${res.status}`, message: raw };
  } catch {
    return { code: `http_${res.status}`, message: raw.slice(0, 500) };
  }
}

/** Base class for all SDK errors. */
export class KillSwitchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'KillSwitchError';
  }
}

/** Non-2xx HTTP response from the API. */
export class KillSwitchApiError extends KillSwitchError {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(parsed.message, options);
    this.name = 'KillSwitchApiError';
    this.status = status;
    this.code = parsed.code;
    this.details = parsed.details;
  }

  static async fromResponse(res: Response): Promise<KillSwitchApiError> {
    return killSwitchErrorFromResponse(res);
  }
}

export class AuthenticationError extends KillSwitchApiError {
  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(status, parsed, options);
    this.name = 'AuthenticationError';
  }
}

export class PermissionDeniedError extends KillSwitchApiError {
  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(status, parsed, options);
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends KillSwitchApiError {
  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(status, parsed, options);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends KillSwitchApiError {
  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(status, parsed, options);
    this.name = 'BadRequestError';
  }
}

export class RateLimitError extends KillSwitchApiError {
  readonly retryAfterMs?: number;

  constructor(status: number, parsed: ParsedApiError, retryAfterMs?: number) {
    super(status, parsed);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class InternalServerError extends KillSwitchApiError {
  constructor(status: number, parsed: ParsedApiError, options?: ErrorOptions) {
    super(status, parsed, options);
    this.name = 'InternalServerError';
  }
}

/** Network failure, DNS, TLS, or connection reset before a response. */
export class APIConnectionError extends KillSwitchError {
  readonly cause?: unknown;

  constructor(message: string, options?: ErrorOptions & { cause?: unknown }) {
    super(message, options);
    this.name = 'APIConnectionError';
    this.cause = options?.cause;
  }
}

/** Request aborted via `AbortSignal` (user or timeout). */
export class APIUserAbortError extends KillSwitchError {
  constructor(message = 'Request was aborted') {
    super(message);
    this.name = 'APIUserAbortError';
  }
}

function parseRetryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get('retry-after');
  if (!raw) return undefined;
  const sec = Number(raw);
  if (!Number.isNaN(sec) && sec >= 0) return sec * 1000;
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

export async function killSwitchErrorFromResponse(res: Response): Promise<KillSwitchApiError> {
  const parsed = await parseErrorBody(res);
  const status = res.status;

  if (status === 401) return new AuthenticationError(status, parsed);
  if (status === 403) return new PermissionDeniedError(status, parsed);
  if (status === 404) return new NotFoundError(status, parsed);
  if (status === 400 || status === 422) return new BadRequestError(status, parsed);
  if (status === 429) return new RateLimitError(status, parsed, parseRetryAfterMs(res));
  if (status >= 500) return new InternalServerError(status, parsed);
  return new KillSwitchApiError(status, parsed);
}
