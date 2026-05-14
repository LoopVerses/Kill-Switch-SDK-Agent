/** Per-request overrides (OpenAI-style). */
export type RequestCallOptions = {
  /** Abort the in-flight request (merged with client timeout). */
  signal?: AbortSignal;
};
