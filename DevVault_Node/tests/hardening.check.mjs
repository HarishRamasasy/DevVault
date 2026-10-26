// Production-hardening check (npm run test:hardening). Needs no database:
// the app is loaded without connecting, so health reports "degraded".
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (env) =>
  spawnSync(process.execPath, ['-e', `await import('./config/env.js')`, '--input-type=module'], {
    cwd: root,
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  });

// 1. env validation (no environment.env fallback matters: vars are checked after dotenv, so blank them)
let r = run({ MONGO_URI: '', JWT_SECRET: '', CLIENT_URL: '' });
assert.equal(r.status, 1);
assert.match(r.stderr, /MONGO_URI, JWT_SECRET, CLIENT_URL/);
assert.ok(!r.stderr.includes('mongodb'), 'must not print values');
r = run({ MONGO_URI: 'mongodb://x', JWT_SECRET: 'short', CLIENT_URL: 'http://a', NODE_ENV: 'production' });
assert.equal(r.status, 1);
assert.match(r.stderr, /at least 32/);
console.log('ok env validation');

// 2. app behaviour
process.env.MONGO_URI = 'mongodb://unused';
process.env.JWT_SECRET = 'x'.repeat(32);
process.env.CLIENT_URL = 'https://app.example.test';
process.env.NODE_ENV = 'production';
const { default: app } = await import(pathToFileURL(path.join(root, 'app.js')));
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;
const post = (url, body, headers = {}) =>
  fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

let res = await fetch(`${base}/api/health`);
assert.equal(res.status, 503);
assert.deepEqual(await res.json(), { status: 'degraded', db: 'disconnected' });
assert.ok(res.headers.get('x-content-type-options'), 'helmet headers');
assert.ok(!res.headers.get('x-powered-by'), 'x-powered-by hidden');
console.log('ok health + headers');

res = await fetch(`${base}/api/snippets`, { headers: { Origin: 'https://evil.test' } });
assert.equal(res.status, 401);
assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
assert.notEqual(res.headers.get('access-control-allow-origin'), 'https://evil.test');
res = await fetch(`${base}/api/snippets`, { headers: { Origin: 'https://app.example.test' } });
assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example.test');
console.log('ok cors + auth required');

res = await post('/api/notes', JSON.stringify({ code: 'a'.repeat(300 * 1024) }));
assert.equal(res.status, 413);
console.log('ok body limit');

res = await fetch(`${base}/api/nope`);
assert.equal(res.status, 404);

// failed login attempts (invalid body -> 400, a non-2xx) are throttled after 10
let last;
for (let i = 0; i < 11; i++) last = await post('/api/auth/login', '{}');
assert.equal(last.status, 429);
console.log('ok auth rate limit');

server.close();
console.log('hardening checks passed');
process.exit(0);
