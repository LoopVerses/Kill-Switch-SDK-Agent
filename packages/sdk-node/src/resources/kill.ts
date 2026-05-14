import type { KillEventRecord } from '@agent-killswitch/shared-types';

import { killSwitchErrorFromResponse } from '../errors.js';
import type { RequestRunner } from '../core/runner.js';
import type { RequestCallOptions } from './types.js';

export type RecordKillInput = {
  agentExternalRef: string;
  reason: string;
  score?: number;
  policyId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  /**
   * Optional explicit idempotency key. If omitted, the SDK derives one from
   * `agentExternalRef` + `correlationId` (when present) so that retries of
   * the *same* logical kill collapse server-side. Pass an explicit value to
   * scope idempotency to a higher-level workflow.
   */
  idempotencyKey?: string;
};

function deriveIdempotencyKey(input: RecordKillInput): string | undefined {
  if (input.idempotencyKey) return input.idempotencyKey;
  if (input.correlationId) return `kill:${input.agentExternalRef}:${input.correlationId}`;
  return undefined;
}

export class Kill {
  constructor(private readonly runner: RequestRunner) {}

  /** `GET /agents/:externalRef/kill/latest` — returns `null` on **404**. */
  async latest(
    agentExternalRef: string,
    call?: RequestCallOptions
  ): Promise<KillEventRecord | null> {
    const path = `/agents/${encodeURIComponent(agentExternalRef)}/kill/latest`;
    const res = await this.runner.fetch('GET', path, { jsonBody: false, call });
    if (res.status === 404) return null;
    if (!res.ok) throw await killSwitchErrorFromResponse(res);
    return (await res.json()) as KillEventRecord;
  }

  /** `POST /kill` — records a kill decision. Auto-attaches an `Idempotency-Key` derived from `correlationId` if not provided. */
  async record(input: RecordKillInput, call?: RequestCallOptions): Promise<KillEventRecord> {
    const idempotencyKey = call?.idempotencyKey ?? deriveIdempotencyKey(input);
    return this.runner.requestJson('POST', '/kill', {
      body: {
        agentExternalRef: input.agentExternalRef,
        reason: input.reason,
        score: input.score,
        policyId: input.policyId,
        correlationId: input.correlationId,
        metadata: input.metadata ?? {},
      },
      okStatuses: [201],
      call: idempotencyKey ? { ...call, idempotencyKey } : call,
    });
  }

  /** `POST /kill/evaluate/:externalRef` — response shape depends on kill-core. */
  async evaluate(
    agentExternalRef: string,
    call?: RequestCallOptions
  ): Promise<Record<string, unknown>> {
    return this.runner.requestJson(
      'POST',
      `/kill/evaluate/${encodeURIComponent(agentExternalRef)}`,
      {
        okStatuses: [200],
        call,
      }
    );
  }
}
