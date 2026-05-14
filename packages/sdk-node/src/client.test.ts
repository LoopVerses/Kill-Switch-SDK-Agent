import test from 'node:test';
import assert from 'node:assert/strict';
import AgentKillSwitch, { KillSwitchClient, AuthenticationError } from './index.ts';

test('KillSwitchClient alias works and getLastKill returns null on 404', async () => {
  const client = new KillSwitchClient({
    baseUrl: 'http://example.test',
    maxRetries: 0,
    fetchImpl: async () => new Response(null, { status: 404 }),
  });
  const out = await client.getLastKill('agent-1');
  assert.equal(out, null);
});

test('nested kill.latest uses /agents/:ref/kill/latest', async () => {
  let url = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    maxRetries: 0,
    fetchImpl: async (u) => {
      url = String(u);
      return new Response(JSON.stringify({ id: 'k1', agentId: 'a1', reason: 'x', decidedAt: '2026-01-01T00:00:00Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const out = await client.kill.latest('my agent');
  assert.equal(url, 'http://example.test/agents/my%20agent/kill/latest');
  assert.equal(out?.reason, 'x');
});

test('KillSwitchApiError path: 401 becomes AuthenticationError', async () => {
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    maxRetries: 0,
    fetchImpl: async () =>
      new Response(JSON.stringify({ detail: 'invalid_api_key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
  await assert.rejects(
    () => client.telemetry.sendBatch([{ x: 1 }]),
    (e: unknown) => e instanceof AuthenticationError,
  );
});

test('telemetry.sendBatch posts JSON and sends User-Agent', async () => {
  let path = '';
  let body = '';
  let ua = '';
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    apiKey: 'sk_test',
    maxRetries: 0,
    fetchImpl: async (u, init) => {
      path = String(u);
      body = String(init?.body ?? '');
      ua = (init?.headers as Headers).get('User-Agent') ?? '';
      assert.equal(init?.method, 'POST');
      assert.equal((init?.headers as Headers).get('X-Api-Key'), 'sk_test');
      return new Response(JSON.stringify({ accepted: 2 }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const out = await client.telemetry.sendBatch([{ type: 'ping' }]);
  assert.equal(path, 'http://example.test/v1/telemetry/batch');
  assert.deepEqual(JSON.parse(body), { events: [{ type: 'ping' }] });
  assert.equal(out.accepted, 2);
  assert.match(ua, /^AgentKillSwitch-JS\//);
});

test('retries on 503 then succeeds', async () => {
  let n = 0;
  const client = new AgentKillSwitch({
    baseURL: 'http://example.test',
    apiKey: 'k',
    maxRetries: 2,
    timeout: 5000,
    fetchImpl: async () => {
      n += 1;
      if (n === 1) return new Response('unavailable', { status: 503 });
      return new Response(JSON.stringify({ accepted: 1 }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const out = await client.telemetry.sendBatch([{ a: 1 }]);
  assert.equal(n, 2);
  assert.equal(out.accepted, 1);
});
