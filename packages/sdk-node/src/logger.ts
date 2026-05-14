/**
 * Minimal pluggable logger. Conforms to `console`, `pino`, and `winston`
 * out of the box — any object with `debug`/`info`/`warn`/`error` works.
 *
 * Loggers are called from the request lifecycle (hooks, retries, redaction
 * fallbacks). The SDK never logs request bodies or credentials — only
 * method, path, status, attempt counter, and pre-redacted error messages.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Silent default — emits nothing. */
export const NoopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};
