import type { AgentRecord } from '@agent-killswitch/shared-types';

import type { RequestRunner } from '../core/runner.js';
import type { RequestCallOptions } from './types.js';

export type RegisterAgentInput = {
  externalRef: string;
  name?: string;
};

export class Agents {
  constructor(private readonly runner: RequestRunner) {}

  async list(limit = 100, call?: RequestCallOptions): Promise<AgentRecord[]> {
    const q = new URLSearchParams({ limit: String(limit) });
    return this.runner.requestJson('GET', `/agents?${q}`, { okStatuses: [200], call });
  }

  async register(input: RegisterAgentInput, call?: RequestCallOptions): Promise<AgentRecord> {
    return this.runner.requestJson('POST', '/agents', {
      body: { externalRef: input.externalRef, name: input.name },
      okStatuses: [201],
      call,
    });
  }
}
