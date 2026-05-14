import { KillSwitchError } from '../errors.js';

/**
 * Optional HMAC request signing — matches `apps/kill-core`'s opt-in signing
 * mode (`REQUIRE_REQUEST_SIGNING=true`). Disabled by default; configure on
 * the client via the `signing` option to enable.
 *
 * Wire format (kept stable across SDK versions):
 *
 *   X-AKS-Key-Id:    <keyId>
 *   X-AKS-Signed-At: <unix epoch seconds>
 *   X-AKS-Nonce:     <random 16 bytes, hex>
 *   X-AKS-Signature: v1=<base64url(HMAC-SHA256(secret, canonical))>
 *
 * `canonical` is the newline-joined string:
 *
 *   v1\n<METHOD>\n<PATH>\n<signed-at>\n<nonce>\n<sha256(body)-hex>
 *
 * The server reconstructs this and compares signatures in constant time.
 *
 * Uses Web Crypto (`globalThis.crypto.subtle`) — available in Node 20+,
 * Cloudflare Workers, Deno, Bun, and modern browsers without polyfill.
 */
export type SigningConfig = {
  keyId: string;
  /** Raw secret string. Stored only in-memory; never serialized. */
  secret: string;
  algorithm?: 'HMAC-SHA256';
};

const HEADER_KEY_ID = 'X-AKS-Key-Id';
const HEADER_SIGNED_AT = 'X-AKS-Signed-At';
const HEADER_NONCE = 'X-AKS-Nonce';
const HEADER_SIGNATURE = 'X-AKS-Signature';

function hex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = '';
  for (const b of view) out += b.toString(16).padStart(2, '0');
  return out;
}

function base64Url(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let bin = '';
  for (const b of view) bin += String.fromCharCode(b);
  // btoa is available on every runtime listed in the SDK's compatibility table.
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new KillSwitchError(
      'Web Crypto (globalThis.crypto.subtle) is required for request signing.'
    );
  }
  return c.subtle;
}

function randomNonceHex(bytes = 16): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues) {
    throw new KillSwitchError('crypto.getRandomValues is required for request signing.');
  }
  const buf = new Uint8Array(bytes);
  c.getRandomValues(buf);
  return hex(buf.buffer);
}

async function sha256Hex(input: string): Promise<string> {
  const subtle = getSubtle();
  const data = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', data);
  return hex(digest);
}

async function hmacSha256(secret: string, message: string): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return subtle.sign('HMAC', key, new TextEncoder().encode(message));
}

/** Mutates `headers` in place to attach signature headers. */
export async function signRequest(
  cfg: SigningConfig,
  method: string,
  path: string,
  body: string | undefined,
  headers: Headers,
  now: () => number = () => Date.now()
): Promise<void> {
  if ((cfg.algorithm ?? 'HMAC-SHA256') !== 'HMAC-SHA256') {
    throw new KillSwitchError(`Unsupported signing algorithm: ${cfg.algorithm}`);
  }
  const signedAt = Math.floor(now() / 1000).toString();
  const nonce = randomNonceHex();
  const bodyHash = await sha256Hex(body ?? '');
  const canonical = `v1\n${method.toUpperCase()}\n${path}\n${signedAt}\n${nonce}\n${bodyHash}`;
  const sig = await hmacSha256(cfg.secret, canonical);
  headers.set(HEADER_KEY_ID, cfg.keyId);
  headers.set(HEADER_SIGNED_AT, signedAt);
  headers.set(HEADER_NONCE, nonce);
  headers.set(HEADER_SIGNATURE, `v1=${base64Url(sig)}`);
}
