// Sprint 9 snippets API check against the configured DB (npm run test:snippets).
// Creates two throwaway *@example.test users on port 5057 and deletes them (and their data) afterwards.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const mongoose = require('mongoose');
await import(pathToFileURL(path.join(root, 'config/env.js')));
if (process.env.TEST_MONGO_URI) process.env.MONGO_URI = process.env.TEST_MONGO_URI; // keep tests off real data
await import(pathToFileURL(path.join(root, 'config/db.js'))); // applies the project's Windows DNS fix
await mongoose.connect(process.env.MONGO_URI);

const PORT = 5057;
const API = `http://localhost:${PORT}/api`;
const stamp = Date.now();
const emailA = `s9-a-${stamp}@example.test`;
const emailB = `s9-b-${stamp}@example.test`;
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

const login = async (email) => {
  await call('POST', '/auth/register', { name: 'Snippet User', email, password: 'password123' });
  return (await call('POST', '/auth/login', { email, password: 'password123' })).body.data.token;
};

try {
  const tokenA = await login(emailA);
  const tokenB = await login(emailB);
  const folderA = (await call('POST', '/folders', { name: `f-${stamp}` }, tokenA)).body.data.folder;
  const tag1 = (await call('POST', '/tags', { name: `hooks-${stamp}` }, tokenA)).body.data.tag;
  const tag2 = (await call('POST', '/tags', { name: `infra-${stamp}` }, tokenA)).body.data.tag;
  const folderB = (await call('POST', '/folders', { name: `fb-${stamp}` }, tokenB)).body.data.folder;
  const tagB = (await call('POST', '/tags', { name: `tb-${stamp}` }, tokenB)).body.data.tag;
  const CODE = '\tfunction a() {\n    return "<script>alert(1)</script>";\n}\n\n';
  const base = { title: 't', code: 'x', language: 'javascript' };
  const ZERO = '000000000000000000000000';
  let snippet;

  await test('unauthenticated requests rejected (401)', async () => {
    const routes = [
      ['GET', '/snippets'],
      ['POST', '/snippets'],
      ['GET', `/snippets/${ZERO}`],
      ['PUT', `/snippets/${ZERO}`],
      ['DELETE', `/snippets/${ZERO}`],
      ['PATCH', `/snippets/${ZERO}/favorite`],
    ];
    for (const [m, u] of routes) assert.equal((await call(m, u, m === 'GET' ? null : base)).status, 401, `${m} ${u}`);
  });

  await test('create snippet; code kept verbatim; protected fields ignored', async () => {
    const r = await call(
      'POST',
      '/snippets',
      {
        title: '  useDebounce  ',
        description: 'React hook',
        code: CODE,
        language: 'typescript',
        folder: folderA._id,
        tags: [tag1._id, tag2._id, tag1._id],
        user: ZERO,
        _id: '000000000000000000000001',
        createdAt: '2000-01-01T00:00:00.000Z',
      },
      tokenA
    );
    assert.equal(r.status, 201, r.raw);
    snippet = r.body.data.snippet;
    assert.equal(snippet.title, 'useDebounce');
    assert.equal(snippet.code, CODE, 'whitespace, tabs, trailing newlines preserved');
    assert.equal(snippet.language, 'typescript');
    assert.equal(snippet.folder.name, folderA.name);
    assert.equal(snippet.tags.length, 2, 'tags deduped + populated');
    assert.notEqual(snippet._id, '000000000000000000000001');
    assert.notEqual(snippet.user, ZERO);
    assert.ok(!snippet.createdAt.startsWith('2000'));
    assert.equal(snippet.favorite, false);
  });

  await test('description/folder/tags optional', async () => {
    const r = await call('POST', '/snippets', { ...base, title: 'Z minimal' }, tokenA);
    assert.equal(r.status, 201, r.raw);
    assert.equal(r.body.data.snippet.description, '');
    assert.equal(r.body.data.snippet.folder, null);
    assert.deepEqual(r.body.data.snippet.tags, []);
  });

  await test('invalid payloads rejected (400)', async () => {
    const bad = [
      { code: 'x', language: 'javascript' },
      { ...base, code: '   \n ' },
      { title: 't', code: 'x' },
      { ...base, language: 'brainfuck' },
      { ...base, title: 'x'.repeat(151) },
      { ...base, description: 'x'.repeat(501) },
      { ...base, code: 'x'.repeat(50001) },
      { ...base, folder: 'nope' },
      { ...base, tags: ['nope'] },
      { ...base, title: { $gt: '' } },
      { ...base, code: ['a'] },
    ];
    for (const b of bad) {
      assert.equal((await call('POST', '/snippets', b, tokenA)).status, 400, JSON.stringify(b).slice(0, 80));
    }
    assert.equal((await call('PUT', `/snippets/${snippet._id}`, { language: 'cobol' }, tokenA)).status, 400);
    assert.equal((await call('GET', '/snippets/not-an-id', null, tokenA)).status, 400);
    assert.equal((await call('GET', '/snippets?sort=bogus', null, tokenA)).status, 400);
    assert.equal((await call('GET', '/snippets?language=cobol', null, tokenA)).status, 400);
  });

  await test("cannot attach another user's folder or tag (404)", async () => {
    assert.equal((await call('POST', '/snippets', { ...base, folder: folderB._id }, tokenA)).status, 404);
    assert.equal((await call('POST', '/snippets', { ...base, tags: [tagB._id] }, tokenA)).status, 404);
    assert.equal((await call('PUT', `/snippets/${snippet._id}`, { tags: [tagB._id] }, tokenA)).status, 404);
  });

  await test("user B cannot read, edit, favorite or delete user A's snippet (403)", async () => {
    assert.equal((await call('GET', `/snippets/${snippet._id}`, null, tokenB)).status, 403);
    assert.equal((await call('PUT', `/snippets/${snippet._id}`, { title: 'hacked' }, tokenB)).status, 403);
    assert.equal((await call('PATCH', `/snippets/${snippet._id}/favorite`, null, tokenB)).status, 403);
    assert.equal((await call('DELETE', `/snippets/${snippet._id}`, null, tokenB)).status, 403);
    assert.equal((await call('GET', '/snippets', null, tokenB)).body.data.pagination.total, 0, "B's list is empty");
  });

  await test('partial update keeps other fields; owner cannot be reassigned', async () => {
    const r = await call('PUT', `/snippets/${snippet._id}`, { title: 'A useDebounce', tags: [tag1._id], user: 'x' }, tokenA);
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.data.snippet.title, 'A useDebounce');
    assert.equal(r.body.data.snippet.code, CODE);
    assert.equal(r.body.data.snippet.tags.length, 1);
    assert.equal(r.body.data.snippet.folder.name, folderA.name);
    const c = await call('PUT', `/snippets/${snippet._id}`, { description: null, folder: '' }, tokenA);
    assert.equal(c.status, 200, c.raw);
    assert.equal(c.body.data.snippet.description, '');
    assert.equal(c.body.data.snippet.folder, null);
    await call('PUT', `/snippets/${snippet._id}`, { folder: folderA._id }, tokenA);
    assert.equal((await call('GET', `/snippets/${snippet._id}`, null, tokenA)).status, 200, 'still owned by A');
  });

  await test('favorite toggles', async () => {
    const r = await call('PATCH', `/snippets/${snippet._id}/favorite`, null, tokenA);
    assert.equal(r.body.data.snippet.favorite, true);
  });

  await test('search, filters and sorting work together', async () => {
    await call(
      'POST',
      '/snippets',
      { title: 'b docker', code: 'FROM node:22\nRUN npm ci', language: 'dockerfile', tags: [tag2._id] },
      tokenA
    );
    await call(
      'POST',
      '/snippets',
      {
        title: 'C mongo',
        description: 'aggregate pipeline',
        code: 'db.x.aggregate([{ $lookup: {} }])',
        language: 'javascript',
        folder: folderA._id,
      },
      tokenA
    );
    const get = async (q) => (await call('GET', `/snippets${q}`, null, tokenA)).body.data;
    assert.equal((await get('?search=npm%20ci')).pagination.total, 1, 'code search');
    assert.equal((await get('?search=pipeline')).pagination.total, 1, 'description search');
    assert.equal((await get('?search=debounce')).pagination.total, 1, 'title search');
    assert.equal((await get('?search=dockerfile')).pagination.total, 1, 'language search');
    assert.equal((await get(`?search=infra-${stamp}`)).pagination.total, 1, 'tag name search');
    assert.equal((await get('?search=$lookup')).pagination.total, 1, 'regex chars escaped');
    assert.equal((await get('?language=javascript')).pagination.total, 2);
    assert.equal((await get(`?language=javascript&folder=${folderA._id}`)).pagination.total, 1);
    assert.equal((await get(`?folder=${folderA._id}&favorite=true`)).pagination.total, 1);
    assert.equal((await get(`?tags=${tag1._id}`)).pagination.total, 1);
    assert.equal((await get('?search=mongo&language=typescript')).pagination.total, 0);
    const titles = ['A useDebounce', 'b docker', 'C mongo', 'Z minimal'];
    assert.deepEqual((await get('?sort=az')).snippets.map((s) => s.title), titles);
    assert.deepEqual((await get('?sort=za')).snippets.map((s) => s.title), [...titles].reverse());
    assert.equal((await get('?sort=oldest')).snippets[0].title, 'A useDebounce');
    assert.equal((await get('?sort=newest')).snippets[0].title, 'C mongo');
    assert.equal((await get('?sort=updated&limit=1&page=2')).snippets.length, 1, 'pagination');
  });

  await test('deleting a tag removes it from snippets (and notes) without deleting them', async () => {
    const n = (await call('POST', '/notes', { title: 'n', content: 'c', tags: [tag1._id] }, tokenA)).body.data.note;
    assert.equal((await call('DELETE', `/tags/${tag1._id}`, null, tokenA)).status, 200);
    assert.equal((await call('GET', `/snippets/${snippet._id}`, null, tokenA)).body.data.snippet.tags.length, 0);
    assert.equal((await call('GET', `/notes/${n._id}`, null, tokenA)).body.data.note.tags.length, 0);
  });

  await test('deleting a folder clears it from snippets without deleting them', async () => {
    assert.equal((await call('DELETE', `/folders/${folderA._id}`, null, tokenA)).status, 200);
    assert.equal((await call('GET', `/snippets/${snippet._id}`, null, tokenA)).body.data.snippet.folder, null);
    assert.equal((await call('GET', '/snippets', null, tokenA)).body.data.pagination.total, 4);
  });

  await test('delete snippet, then 404', async () => {
    assert.equal((await call('DELETE', `/snippets/${snippet._id}`, null, tokenA)).status, 200);
    assert.equal((await call('GET', `/snippets/${snippet._id}`, null, tokenA)).status, 404);
    assert.equal((await call('DELETE', `/snippets/${snippet._id}`, null, tokenA)).status, 404);
  });
} finally {
  const users = await mongoose.connection
    .collection('users')
    .find({ email: { $regex: `-${stamp}@example\\.test$` } })
    .toArray();
  const ids = users.map((u) => u._id);
  for (const c of ['snippets', 'notes', 'tags', 'folders', 'bookmarks']) {
    await mongoose.connection.collection(c).deleteMany({ user: { $in: ids } });
  }
  const del = await mongoose.connection.collection('users').deleteMany({ _id: { $in: ids } });
  console.log(`cleanup: removed ${del.deletedCount} test users`);
  server.kill();
}

for (const r of results) console.log(r.join(' | '));
await mongoose.disconnect();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
