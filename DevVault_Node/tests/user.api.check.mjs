// Sprint 7 profile/password API check against the configured DB (npm run test:users).
// Creates two throwaway *@example.test users on port 5055 and deletes them afterwards.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const mongoose = require('mongoose');
await import(pathToFileURL(path.join(root, 'config/env.js')));
await import(pathToFileURL(path.join(root, 'config/db.js'))); // applies the project's Windows DNS fix
await mongoose.connect(process.env.MONGO_URI);

const PORT = 5055;
const API = `http://localhost:${PORT}/api`;
const stamp = Date.now();
const emailA = `s7-a-${stamp}@example.test`;
const emailB = `s7-b-${stamp}@example.test`;
const results = [];

const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT) } });
let serverErr = '';
server.stderr.on('data', (d) => (serverErr += d));
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes('Server running') && resolve());
  setTimeout(() => reject(new Error('server did not start: ' + serverErr)), 30000);
});

const call = async (method, url, body, token) => {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), raw: text };
};

const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, e.message]);
  }
};

const noSecrets = (raw) => {
  assert.ok(!/"password"/.test(raw), 'password field leaked');
  assert.ok(!raw.includes('$2a$') && !raw.includes('$2b$'), 'hash leaked');
};

let tokenA, tokenB;
try {
  await test('register + login still work', async () => {
    assert.equal((await call('POST', '/auth/register', { name: 'User A', email: emailA, password: 'password123' })).status, 201);
    assert.equal((await call('POST', '/auth/register', { name: 'User B', email: emailB, password: 'password123' })).status, 201);
    const a = await call('POST', '/auth/login', { email: emailA, password: 'password123' });
    assert.equal(a.status, 200);
    noSecrets(a.raw);
    tokenA = a.body.data.token;
    tokenB = (await call('POST', '/auth/login', { email: emailB, password: 'password123' })).body.data.token;
  });

  await test('unauthenticated requests rejected (401)', async () => {
    assert.equal((await call('GET', '/users/me')).status, 401);
    assert.equal((await call('PUT', '/users/me', { name: 'x' })).status, 401);
    assert.equal((await call('PUT', '/users/me/password', { currentPassword: 'a', newPassword: 'bbbbbbbb' })).status, 401);
    assert.equal((await call('GET', '/users/me', null, 'garbage.token.here')).status, 401);
  });

  await test('GET /users/me returns safe profile', async () => {
    const r = await call('GET', '/users/me', null, tokenA);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.user.email, emailA);
    assert.ok(r.body.data.user.createdAt);
    noSecrets(r.raw);
  });

  await test('PUT /users/me updates name, trims + lowercases email', async () => {
    const newEmail = `  S7-A2-${stamp}@Example.TEST `;
    const r = await call('PUT', '/users/me', { name: '  Alice  ', email: newEmail }, tokenA);
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.data.user.name, 'Alice');
    assert.equal(r.body.data.user.email, newEmail.trim().toLowerCase());
    noSecrets(r.raw);
    const login = await call('POST', '/auth/login', { email: newEmail.trim(), password: 'password123' });
    assert.equal(login.status, 200, 'login with new (mixed-case) email');
  });

  await test('duplicate email rejected with 409', async () => {
    const r = await call('PUT', '/users/me', { email: emailB.toUpperCase() }, tokenA);
    assert.equal(r.status, 409, r.raw);
    assert.equal(r.body.success, false);
  });

  await test('invalid profile input rejected (400)', async () => {
    assert.equal((await call('PUT', '/users/me', { email: 'not-an-email' }, tokenA)).status, 400);
    assert.equal((await call('PUT', '/users/me', { name: '   ' }, tokenA)).status, 400);
    assert.equal((await call('PUT', '/users/me', {}, tokenA)).status, 400);
    assert.equal((await call('PUT', '/users/me', { name: 'x'.repeat(101) }, tokenA)).status, 400);
  });

  await test('body cannot target another user or overwrite protected fields', async () => {
    const before = await mongoose.connection.collection('users').findOne({ email: emailB });
    const r = await call('PUT', '/users/me', { _id: String(before._id), id: String(before._id), userId: String(before._id), name: 'Hacked', password: 'x', role: 'admin' }, tokenA);
    assert.equal(r.status, 200);
    const after = await mongoose.connection.collection('users').findOne({ email: emailB });
    assert.equal(after.name, 'User B', 'user B untouched');
    assert.equal(after.password, before.password);
    const me = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(r.body.data.user._id) });
    assert.equal(me.role, undefined, 'role not stored');
    assert.ok(me.password.startsWith('$2'), 'own password not overwritten');
    assert.notEqual(r.body.data.user._id, String(before._id));
  });

  await test('wrong current password rejected (400)', async () => {
    const r = await call('PUT', '/users/me/password', { currentPassword: 'wrongpass1', newPassword: 'newpassword1' }, tokenB);
    assert.equal(r.status, 400);
    assert.match(r.body.message, /incorrect/);
  });

  await test('same new password rejected (400)', async () => {
    const r = await call('PUT', '/users/me/password', { currentPassword: 'password123', newPassword: 'password123' }, tokenB);
    assert.equal(r.status, 400);
  });

  await test('short / missing new password rejected (400)', async () => {
    assert.equal((await call('PUT', '/users/me/password', { currentPassword: 'password123', newPassword: 'short' }, tokenB)).status, 400);
    assert.equal((await call('PUT', '/users/me/password', { currentPassword: 'password123' }, tokenB)).status, 400);
    assert.equal((await call('PUT', '/users/me/password', { newPassword: 'newpassword1' }, tokenB)).status, 400);
  });

  await test('valid password change hashes and works for login', async () => {
    const r = await call('PUT', '/users/me/password', { currentPassword: 'password123', newPassword: 'newpassword1' }, tokenB);
    assert.equal(r.status, 200, r.raw);
    noSecrets(r.raw);
    const doc = await mongoose.connection.collection('users').findOne({ email: emailB });
    assert.ok(doc.password.startsWith('$2') && doc.password !== 'newpassword1', 'stored hashed');
    assert.equal((await call('POST', '/auth/login', { email: emailB, password: 'password123' })).status, 401);
    assert.equal((await call('POST', '/auth/login', { email: emailB, password: 'newpassword1' })).status, 200);
  });

  await test('existing /auth/me and tag CRUD still work', async () => {
    assert.equal((await call('GET', '/auth/me', null, tokenA)).status, 200);
    const t = await call('POST', '/tags', { name: `s7-${stamp}` }, tokenA);
    assert.equal(t.status, 201, t.raw);
    assert.equal((await call('GET', '/tags', null, tokenA)).status, 200);
    assert.equal((await call('DELETE', `/tags/${t.body.data.tag._id}`, null, tokenA)).status, 200);
    assert.equal((await call('GET', '/bookmarks', null, tokenA)).status, 200);
    assert.equal((await call('GET', '/folders', null, tokenA)).status, 200);
  });
} finally {
  const users = await mongoose.connection.collection('users').find({ email: { $regex: `-${stamp}@example\\.test$` } }).toArray();
  const ids = users.map((u) => u._id);
  for (const c of ['tags', 'folders', 'bookmarks']) await mongoose.connection.collection(c).deleteMany({ user: { $in: ids } });
  const del = await mongoose.connection.collection('users').deleteMany({ _id: { $in: ids } });
  console.log(`cleanup: removed ${del.deletedCount} test users`);
  server.kill();
}

for (const r of results) console.log(r.join(' | '));
await mongoose.disconnect();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
