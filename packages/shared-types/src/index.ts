/** Cross-service contracts for the kill switch platform. */

export type AgentId = string;
export type TenantId = string;

export type KillReason =
  | 'policy_violation'
  | 'anomaly_score'
  | 'manual_override'
  | 'budget_exceeded'
  | 'rate_limit';

export interface KillDecision {
  agentId: AgentId;
  tenantId: TenantId;
  reason: KillReason;
  score?: number;
  policyId?: string;
  decidedAt: string;
  traceId?: string;
}

/** Row returned by `GET /agents/:externalRef/kill/latest` and `POST /kill` (API camelCase JSON). */
export interface KillEventRecord {
  id: string;
  agentId: string;
  reason: string;
  score?: number | null;
  decidedAt: string;
}

export interface TelemetryBatchAccepted {
  accepted: number;
}

export interface AgentRecord {
  id: string;
  externalRef: string;
  name: string;
  status: string;
}

export interface AgentHeartbeat {
  agentId: AgentId;
  tenantId: TenantId;
  emittedAt: string;
  tokensUsed?: number;
  toolCalls?: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
