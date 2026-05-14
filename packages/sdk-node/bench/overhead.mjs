/**
 * Microbench: JSON parse + HMAC verify (proxy for SDK decode + signature path).
 * Run: node packages/sdk-node/bench/overhead.mjs
 *
 * Threshold matches docs/sdk/benchmarks/README.md (p99 < 2ms default).
 */
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";

const ITERS = 50_000;
const WARMUP = 2_000;
const P99_THRESHOLD_MS = 2.0;

const secret = crypto.randomBytes(32);
const payload = Buffer.from(
  JSON.stringify({
    allow: true,
    reason: { code: "ALLOWED_DEFAULT", hint: "ok" },
    auditId: "01HZXAMPLE0000000000000000",
    policyVersion: "pv_2026_01",
  }),
);

const sig = crypto.createHmac("sha256", secret).update(payload).digest();

function verifyAndParse(body, expected) {
  const calc = crypto.createHmac("sha256", secret).update(body).digest();
  if (!crypto.timingSafeEqual(calc, expected)) throw new Error("sig");
  return JSON.parse(body.toString("utf8"));
}

const samples = [];
for (let i = 0; i < WARMUP; i++) verifyAndParse(payload, sig);

for (let i = 0; i < ITERS; i++) {
  const t0 = performance.now();
  verifyAndParse(payload, sig);
  samples.push(performance.now() - t0);
}

samples.sort((a, b) => a - b);
const p50 = samples[Math.floor(0.5 * (samples.length - 1))];
const p99 = samples[Math.floor(0.99 * (samples.length - 1))];
const p999 = samples[Math.floor(0.999 * (samples.length - 1))];

console.log(
  JSON.stringify(
    { iters: ITERS, unit: "ms", p50, p99, p999, threshold_p99: P99_THRESHOLD_MS },
    null,
    2,
  ),
);

if (p99 >= P99_THRESHOLD_MS) {
  console.error(`FAIL: p99 ${p99}ms >= ${P99_THRESHOLD_MS}ms`);
  process.exit(1);
}
