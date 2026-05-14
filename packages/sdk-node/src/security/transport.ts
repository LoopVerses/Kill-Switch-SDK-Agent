import { KillSwitchError } from '../errors.js';

const CRLF_OR_NUL = /[\r\n\0]/;
const MAX_HEADER_NAME = 256;
const MAX_HEADER_VALUE = 8192;

/** Strip sequences that must never appear in headers (response splitting / injection). */
export function sanitizeHeaderRecord(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const name = k.trim();
    if (!name) continue;
    if (name.length > MAX_HEADER_NAME) {
      throw new KillSwitchError(`HTTP header name exceeds ${MAX_HEADER_NAME} characters.`);
    }
    if (CRLF_OR_NUL.test(name) || CRLF_OR_NUL.test(v)) {
      throw new KillSwitchError(
        'HTTP header name or value contains CR, LF, or NUL (rejected for security).'
      );
    }
    if (v.length > MAX_HEADER_VALUE) {
      throw new KillSwitchError(`HTTP header value exceeds ${MAX_HEADER_VALUE} characters.`);
    }
    out[name] = v;
  }
  return out;
}

/** Ensure relative paths cannot smuggle absolute URLs or newlines. */
export function assertSafeRequestPath(path: string): void {
  if (typeof path !== 'string' || path.length === 0 || !path.startsWith('/')) {
    throw new KillSwitchError('Internal request path must start with "/".');
  }
  if (CRLF_OR_NUL.test(path) || path.includes('://')) {
    throw new KillSwitchError('Invalid request path.');
  }
  if (path.includes('..')) {
    throw new KillSwitchError('Request path must not contain "..".');
  }
}

/**
 * Normalizes and validates API origin.
 * - Requires absolute URL with `https:` unless {@link allowInsecureHttp} is true (then `http:` allowed for dev).
 * - Rejects userinfo (`user:pass@host`), query, and fragment on the base URL.
 * - Allows optional pathname prefix (e.g. `https://api.example.com/v1`) without `..`.
 */
export function validateApiOrigin(raw: string, allowInsecureHttp: boolean): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new KillSwitchError(
      'baseURL must be a valid absolute URL (e.g. https://api.example.com).'
    );
  }
  if (u.username !== '' || u.password !== '') {
    throw new KillSwitchError(
      'Credentials in baseURL are forbidden; use apiKey or bearerToken options.'
    );
  }
  if (u.protocol !== 'https:' && !(allowInsecureHttp && u.protocol === 'http:')) {
    throw new KillSwitchError(
      allowInsecureHttp
        ? 'baseURL scheme must be https: or http:.'
        : 'baseURL must use https: (pass dangerouslyAllowInsecureHttp: true only for trusted local http).'
    );
  }
  if (u.search !== '' || u.hash !== '') {
    throw new KillSwitchError('baseURL must not include query or fragment strings.');
  }
  if (u.pathname.includes('..')) {
    throw new KillSwitchError('baseURL path must not contain "..".');
  }
  const origin = `${u.protocol}//${u.host}`;
  if (u.pathname === '' || u.pathname === '/') {
    return origin;
  }
  return `${origin}${u.pathname.replace(/\/$/u, '')}`;
}
