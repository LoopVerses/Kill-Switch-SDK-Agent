import { AgentKillSwitch, KillSwitchClient } from './client.js';

export { AgentKillSwitch, KillSwitchClient };
export type { AgentKillSwitchOptions, ClientOptions } from './client.js';

export { VERSION } from './version.js';

export type { RegisterAgentInput } from './resources/agents.js';
export type { RecordKillInput } from './resources/kill.js';
export type { RequestCallOptions } from './resources/types.js';

export { Agents } from './resources/agents.js';
export { Telemetry } from './resources/telemetry.js';
export { Kill } from './resources/kill.js';
export { Health } from './resources/health.js';

export {
  KillSwitchError,
  KillSwitchApiError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  BadRequestError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIUserAbortError,
  parseErrorBody,
  redactSensitiveStrings,
} from './errors.js';

export type { ParsedApiError } from './errors.js';

export { validateApiOrigin, sanitizeHeaderRecord, assertSafeRequestPath } from './security/transport.js';

export type {
  AgentRecord,
  KillEventRecord,
  TelemetryBatchAccepted,
} from '@agent-killswitch/shared-types';

export default AgentKillSwitch;
