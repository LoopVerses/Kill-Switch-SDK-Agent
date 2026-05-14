import test from 'node:test';
import assert from 'node:assert/strict';
import AgentKillSwitch, {
  KillSwitchClient,
  AuthenticationError,
  KillSwitchError,
  KillSwitchApiError,
  RateLimitError,
  APIUserAbortError,
  createKillSwitchClient,
  VERSION,
  type Hooks,
  type Logger,
} from './index.ts';

const okJson = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

test('KillSwitchClient alias works and getLastKill returns null on 404', async () => {
  const client = new KillSwitchClient({
    baseUrl: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async () => new Response(null, { status: 404 }),
  });
  const out = await client.getLastKill('agent-1');
  assert.equal(out, null);
});

test('createKillSwitchClient factory returns an AgentKillSwitch', () => {
  const client = createKillSwitchClient({
    baseURL: 'https://api.example.com',
    fetch: async () => okJson({}),
  });
  assert.ok(client instanceof AgentKillSwitch);
});

test('nested kill.latest uses /agents/:ref/kill/latest', async () => {
  let url = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async (u) => {
      url = String(u);
      return okJson({ id: 'k1', agentId: 'a1', reason: 'x', decidedAt: '2026-01-01T00:00:00Z' });
    },
  });
  const out = await client.kill.latest('my agent');
  assert.equal(url, 'http://example.test/agents/my%20agent/kill/latest');
  assert.equal(out?.reason, 'x');
});

test('401 becomes AuthenticationError', async () => {
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async () => okJson({ detail: 'invalid_api_key' }, 401),
  });
  await assert.rejects(
    () => client.telemetry.sendBatch([{ x: 1 }]),
    (e: unknown) => e instanceof AuthenticationError
  );
});

test('telemetry.sendBatch posts JSON and sends UA + Request-Id', async () => {
  let path = '';
  let body = '';
  let ua = '';
  let reqId = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    apiKey: 'sk_test',
    maxRetries: 0,
    fetchImpl: async (u, init) => {
      path = String(u);
      body = String(init?.body ?? '');
      ua = (init?.headers as Headers).get('User-Agent') ?? '';
      reqId = (init?.headers as Headers).get('X-Request-Id') ?? '';
      assert.equal(init?.method, 'POST');
      assert.equal((init?.headers as Headers).get('X-Api-Key'), 'sk_test');
      return okJson({ accepted: 2 }, 202);
    },
  });
  const out = await client.telemetry.sendBatch([{ type: 'ping' }]);
  assert.equal(path, 'http://example.test/v1/telemetry/batch');
  assert.deepEqual(JSON.parse(body), { events: [{ type: 'ping' }] });
  assert.equal(out.accepted, 2);
  assert.match(ua, /^AgentKillSwitch-JS\//);
  assert.ok(ua.includes(VERSION));
  assert.match(reqId, /^[0-9a-f-]{16,}$/i);
});

test('retries on 503 then succeeds; honours numeric Retry-After', async () => {
  let n = 0;
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    apiKey: 'k',
    maxRetries: 2,
    timeout: 5000,
    fetchImpl: async () => {
      n += 1;
      if (n === 1)
        return new Response('unavailable', { status: 503, headers: { 'Retry-After': '0' } });
      return okJson({ accepted: 1 }, 202);
    },
  });
  const out = await client.telemetry.sendBatch([{ a: 1 }]);
  assert.equal(n, 2);
  assert.equal(out.accepted, 1);
});

test('http baseURL rejected unless dangerouslyAllowInsecureHttp', () => {
  assert.throws(
    () =>
      new AgentKillSwitch({
        baseURL: 'http://example.test',
        maxRetries: 0,
        fetchImpl: async () => new Response(null, { status: 404 }),
      }),
    (e: unknown) => e instanceof KillSwitchError
  );
});

test('credentials in baseURL rejected', () => {
  assert.throws(
    () =>
      new AgentKillSwitch({
        baseURL: 'https://user:pass@api.example.com',
        fetchImpl: async () => new Response(null),
      }),
    (e: unknown) => e instanceof KillSwitchError
  );
});

test('header CRLF rejected', () => {
  assert.throws(
    () =>
      new AgentKillSwitch({
        baseURL: 'https://api.example.com',
        defaultHeaders: { 'X-Evil': 'a\r\nInjected: 1' },
        fetchImpl: async () => new Response(null),
      }),
    (e: unknown) => e instanceof KillSwitchError
  );
});

test('per-call headers merge but cannot override built-ins', async () => {
  let xCustom = '';
  let xApiKey = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    apiKey: 'real-key',
    maxRetries: 0,
    fetchImpl: async (_u, init) => {
      const h = init?.headers as Headers;
      xCustom = h.get('X-Custom') ?? '';
      xApiKey = h.get('X-Api-Key') ?? '';
      return okJson({ accepted: 1 }, 202);
    },
  });
  await client.telemetry.sendBatch([{ a: 1 }], {
    headers: { 'X-Custom': 'yes', 'X-Api-Key': 'attempt-override' },
  });
  assert.equal(xCustom, 'yes');
  assert.equal(xApiKey, 'real-key'); // built-in wins
});

test('idempotencyKey sent on kill.record (derived from correlationId)', async () => {
  let idem = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async (_u, init) => {
      idem = (init?.headers as Headers).get('Idempotency-Key') ?? '';
      return okJson(
        { id: 'k1', agentId: 'a1', reason: 'r', decidedAt: '2026-01-01T00:00:00Z' },
        201
      );
    },
  });
  await client.kill.record({
    agentExternalRef: 'agent-1',
    reason: 'r',
    correlationId: 'inc-42',
  });
  assert.equal(idem, 'kill:agent-1:inc-42');
});

test('explicit idempotencyKey wins over derived', async () => {
  let idem = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async (_u, init) => {
      idem = (init?.headers as Headers).get('Idempotency-Key') ?? '';
      return okJson(
        { id: 'k1', agentId: 'a1', reason: 'r', decidedAt: '2026-01-01T00:00:00Z' },
        201
      );
    },
  });
  await client.kill.record(
    {
      agentExternalRef: 'agent-1',
      reason: 'r',
      correlationId: 'inc-42',
      idempotencyKey: 'explicit',
    },
    { idempotencyKey: 'per-call' }
  );
  assert.equal(idem, 'per-call');
});

test('hooks fire in order: onRequest → onResponse', async () => {
  const order: string[] = [];
  const hooks: Hooks = {
    onRequest: (ctx) => {
      order.push(`req:${ctx.method}:${ctx.path}:${ctx.attempt}`);
    },
    onResponse: (ctx) => {
      order.push(`res:${ctx.response.status}:${ctx.durationMs >= 0}`);
    },
  };
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    hooks,
    fetchImpl: async () => okJson({ status: 'ok' }),
  });
  await client.health.check();
  assert.deepEqual(order, ['req:GET:/healthz:0', 'res:200:true']);
});

test('onRetry fires before each retry', async () => {
  const retries: number[] = [];
  let n = 0;
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 2,
    hooks: { onRetry: (ctx) => retries.push(ctx.attempt) },
    fetchImpl: async () => {
      n += 1;
      if (n < 3) return new Response('x', { status: 503, headers: { 'Retry-After': '0' } });
      return okJson({ accepted: 1 }, 202);
    },
  });
  await client.telemetry.sendBatch([{ a: 1 }]);
  assert.deepEqual(retries, [0, 1]);
});

test('logger receives retry events', async () => {
  const warns: string[] = [];
  const logger: Logger = {
    debug: () => {},
    info: () => {},
    warn: (m) => warns.push(m),
    error: () => {},
  };
  let n = 0;
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 1,
    logger,
    fetchImpl: async () => {
      n += 1;
      if (n === 1) return new Response('x', { status: 503, headers: { 'Retry-After': '0' } });
      return okJson({ accepted: 1 }, 202);
    },
  });
  await client.telemetry.sendBatch([{ a: 1 }]);
  assert.ok(warns.includes('killswitch.retry'));
});

test('per-call timeout overrides client timeout', async () => {
  // Robust mock: handles the race where the per-call timeout signal may have
  // already aborted by the time the listener is attached (observed on slower
  // CI runners). Also unrefs the fallback timer so it never blocks teardown.
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    timeout: 60_000,
    maxRetries: 0,
    fetchImpl: (_u, init) =>
      new Promise<Response>((resolve, reject) => {
        const s = init?.signal;
        const rejectAsTimeout = () =>
          reject((s?.reason as Error | undefined) ?? new DOMException('aborted', 'TimeoutError'));
        // Fallback resolver — should never fire because the 50ms timeout
        // aborts first. Kept as a safety net so the Promise can't hang.
        const t = setTimeout(() => resolve(new Response('late')), 2_000);
        (t as unknown as { unref?: () => void }).unref?.();
        if (!s) return;
        if (s.aborted) {
          clearTimeout(t);
          rejectAsTimeout();
          return;
        }
        s.addEventListener(
          'abort',
          () => {
            clearTimeout(t);
            rejectAsTimeout();
          },
          { once: true }
        );
      }),
  });
  await assert.rejects(
    () => client.health.check({ timeout: 50 }),
    (e: unknown) => e instanceof APIUserAbortError && /50ms/.test((e as Error).message)
  );
});

test('429 with HTTP-date Retry-After parses into RateLimitError.retryAfterMs', async () => {
  const future = new Date(Date.now() + 1234).toUTCString();
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: 'slow down' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': future },
      }),
  });
  await assert.rejects(
    () => client.telemetry.sendBatch([{ a: 1 }]),
    (e: unknown) => {
      if (!(e instanceof RateLimitError)) return false;
      return typeof e.retryAfterMs === 'number' && e.retryAfterMs >= 0;
    }
  );
});

test('telemetry.sendBatch rejects empty batch without dialling', async () => {
  let called = 0;
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    fetchImpl: async () => {
      called += 1;
      return okJson({ accepted: 0 }, 202);
    },
  });
  await assert.rejects(
    () => client.telemetry.sendBatch([]),
    (e: unknown) => e instanceof KillSwitchError
  );
  assert.equal(called, 0);
});

test('signing attaches HMAC headers', async () => {
  let captured: Record<string, string | null> = {};
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    dangerouslyAllowInsecureHttp: true,
    maxRetries: 0,
    signing: { keyId: 'kid-1', secret: 'topsecret' },
    fetchImpl: async (_u, init) => {
      const h = init?.headers as Headers;
      captured = {
        keyId: h.get('X-AKS-Key-Id'),
        signedAt: h.get('X-AKS-Signed-At'),
        nonce: h.get('X-AKS-Nonce'),
        sig: h.get('X-AKS-Signature'),
      };
      return okJson({ status: 'ok' });
    },
  });
  await client.health.check();
  assert.equal(captured.keyId, 'kid-1');
  assert.match(captured.signedAt ?? '', /^\d+$/);
  assert.match(captured.nonce ?? '', /^[0-9a-f]{32}$/);
  assert.match(captured.sig ?? '', /^v1=[A-Za-z0-9_-]+$/);
});

test('API error message redacts Bearer token', async () => {
  const res = new Response(JSON.stringify({ message: 'fail Bearer sk_live_abc123secret' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
  const err = await KillSwitchApiError.fromResponse(res);
  assert.ok(!err.message.includes('sk_live'));
  assert.ok(err.message.includes('[REDACTED]'));
});

test('invalid timeout rejected at construction', () => {
  assert.throws(
    () =>
      new AgentKillSwitch({
        baseURL: 'https://api.example.com',
        timeout: -1,
        fetch: async () => new Response(null),
      }),
    (e: unknown) => e instanceof KillSwitchError
  );
});

test('invalid maxRetries rejected at construction', () => {
  assert.throws(
    () =>
      new AgentKillSwitch({
        baseURL: 'https://api.example.com',
        maxRetries: 1.5,
        fetch: async () => new Response(null),
      }),
    (e: unknown) => e instanceof KillSwitchError
  );
});
