import type { TelemetryBatchAccepted } from '@agent-killswitch/shared-types';

import { KillSwitchError } from '../errors.js';
import type { RequestRunner } from '../core/runner.js';
import type { RequestCallOptions } from './types.js';

export class Telemetry {
  constructor(private readonly runner: RequestRunner) {}

  /**
   * Ingest a batch of telemetry events (`POST /v1/telemetry/batch`, **202**).
   *
   * Validates the batch is non-empty before dialling the network — saves a
   * roundtrip when callers forget to guard their accumulator.
   */
  async sendBatch(
    events: Record<string, unknown>[],
    call?: RequestCallOptions
  ): Promise<TelemetryBatchAccepted> {
    if (!Array.isArray(events)) {
      throw new KillSwitchError('telemetry.sendBatch: `events` must be an array.');
    }
    if (events.length === 0) {
      throw new KillSwitchError('telemetry.sendBatch: refusing to send an empty batch.');
    }
    return this.runner.requestJson('POST', '/v1/telemetry/batch', {
      body: { events },
      okStatuses: [202],
      call,
    });
  }
}
