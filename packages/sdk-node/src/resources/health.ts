import type { RequestRunner } from '../core/runner.js';
import type { RequestCallOptions } from './types.js';

export class Health {
  constructor(private readonly runner: RequestRunner) {}

  /** `GET /healthz` — does not require auth. */
  async check(call?: RequestCallOptions): Promise<{ status: string }> {
    return this.runner.requestJson('GET', '/healthz', { okStatuses: [200], call });
  }
}
