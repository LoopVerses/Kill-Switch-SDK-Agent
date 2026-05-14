import type { TelemetryBatchAccepted } from '@agent-killswitch/shared-types';

import type { RequestRunner } from '../core/runner.js';
import type { RequestCallOptions } from './types.js';

export class Telemetry {
  constructor(private readonly runner: RequestRunner) {}

  /** Ingest a batch of telemetry events (`POST /v1/telemetry/batch`, 202). */
  async sendBatch(events: Record<string, unknown>[], call?: RequestCallOptions): Promise<TelemetryBatchAccepted> {
    return this.runner.requestJson('POST', '/v1/telemetry/batch', {
      body: { events },
      okStatuses: [202],
      call,
    });
  }
}
