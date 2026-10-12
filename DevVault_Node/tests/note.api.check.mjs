// Sprint 8 notes API check against the configured DB (npm run test:notes).
// Creates two throwaway *@example.test users on port 5056 and deletes them (and their data) afterwards.
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

const PORT = 5056;
const API = `http://localhost:${PORT}/api`;
const stamp = Date.now();
const emailA = `s8-a-${stamp}@example.test`;
const emailB = `s8-b-${stamp}@example.test`;
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
  await call('POST', '/auth/register', { name: 'Note User', email, password: 'password123' });
  return (await call('POST', '/auth/login', { email, password: 'password123' })).body.data.token;
};

try {
  const tokenA = await login(emailA);
  const tokenB = await login(emailB);
  const folderA = (await call('POST', '/folders', { name: `f-${stamp}` }, tokenA)).body.data.folder;
  const tag1 = (await call('POST', '/tags', { name: `angular-${stamp}` }, tokenA)).body.data.tag;
  const tag2 = (await call('POST', '/tags', { name: `rxjs-${stamp}` }, tokenA)).body.data.tag;
  const folderB = (await call('POST', '/folders', { name: `fb-${stamp}` }, tokenB)).body.data.folder;
  const tagB = (await call('POST', '/tags', { name: `tb-${stamp}` }, tokenB)).body.data.tag;
  let note;

  await test('unauthenticated requests rejected (401)', async () => {
    assert.equal((await call('GET', '/notes')).status, 401);
    assert.equal((await call('POST', '/notes', { title: 't', content: 'c' })).status, 401);
  });

  await test('create note with folder + tags; protected fields ignored; content kept verbatim', async () => {
    const r = await call(
      'POST',
      '/notes',
      {
        title: '  Signals  ',
        content: '  line 1\n<script>alert(1)</script>',
        folder: folderA._id,
        tags: [tag1._id, tag2._id, tag1._id],
        user: '000000000000000000000000',
        _id: '000000000000000000000001',
        createdAt: '2000-01-01T00:00:00.000Z',
      },
      tokenA
    );
    assert.equal(r.status, 201, r.raw);
    note = r.body.data.note;
    assert.equal(note.title, 'Signals');
    assert.equal(note.content, '  line 1\n<script>alert(1)</script>');
    assert.equal(note.folder.name, folderA.name);
    assert.equal(note.tags.length, 2, 'tags deduped + populated');
    assert.notEqual(note._id, '000000000000000000000001');
    assert.notEqual(note.user, '000000000000000000000000');
    assert.ok(!note.createdAt.startsWith('2000'));
    assert.equal(note.favorite, false);
  });

  await test('invalid payloads rejected (400)', async () => {
    assert.equal((await call('POST', '/notes', { content: 'c' }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: 't', content: '   ' }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: 'x'.repeat(151), content: 'c' }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: 't', content: 'x'.repeat(20001) }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: 't', content: 'c', folder: 'nope' }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: 't', content: 'c', tags: ['nope'] }, tokenA)).status, 400);
    assert.equal((await call('POST', '/notes', { title: { $gt: '' }, content: 'c' }, tokenA)).status, 400);
    assert.equal((await call('GET', '/notes/not-an-id', null, tokenA)).status, 400);
    assert.equal((await call('GET', '/notes?sort=bogus', null, tokenA)).status, 400);
  });

  await test("cannot attach another user's folder or tag (404)", async () => {
    assert.equal((await call('POST', '/notes', { title: 't', content: 'c', folder: folderB._id }, tokenA)).status, 404);
    assert.equal((await call('POST', '/notes', { title: 't', content: 'c', tags: [tagB._id] }, tokenA)).status, 404);
    assert.equal((await call('PUT', `/notes/${note._id}`, { folder: folderB._id }, tokenA)).status, 404);
  });

  await test("user B cannot read, edit, favorite or delete user A's note (403)", async () => {
    assert.equal((await call('GET', `/notes/${note._id}`, null, tokenB)).status, 403);
    assert.equal((await call('PUT', `/notes/${note._id}`, { title: 'hacked' }, tokenB)).status, 403);
    assert.equal((await call('PATCH', `/notes/${note._id}/favorite`, null, tokenB)).status, 403);
    assert.equal((await call('DELETE', `/notes/${note._id}`, null, tokenB)).status, 403);
    const list = await call('GET', '/notes', null, tokenB);
    assert.equal(list.body.data.pagination.total, 0, "B's list is empty");
  });

  await test('get + update note (partial update keeps other fields, user cannot be reassigned)', async () => {
    assert.equal((await call('GET', `/notes/${note._id}`, null, tokenA)).body.data.note.title, 'Signals');
    const r = await call('PUT', `/notes/${note._id}`, { title: 'Angular Signals', tags: [tag1._id], user: 'x' }, tokenA);
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.data.note.title, 'Angular Signals');
    assert.equal(r.body.data.note.tags.length, 1);
    assert.equal(r.body.data.note.folder.name, folderA.name);
    assert.equal((await call('GET', `/notes/${note._id}`, null, tokenA)).status, 200, 'still owned by A');
  });

  await test('favorite toggles independently of bookmarks', async () => {
    const r = await call('PATCH', `/notes/${note._id}/favorite`, null, tokenA);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.note.favorite, true);
    const bm = await call('GET', '/bookmarks?favorite=true', null, tokenA);
    assert.equal(bm.body.data.pagination.total, 0);
  });

  await test('search, filters and sorting work together', async () => {
    await call('POST', '/notes', { title: 'b debugging', content: 'null pointer fix', tags: [tag2._id] }, tokenA);
    await call('POST', '/notes', { title: 'C mongo', content: 'aggregate $lookup', folder: folderA._id }, tokenA);
    const get = async (q) => (await call('GET', `/notes${q}`, null, tokenA)).body.data;
    assert.equal((await get('?search=pointer')).pagination.total, 1, 'content search');
    assert.equal((await get('?search=angular')).pagination.total, 1, 'title search');
    assert.equal((await get(`?search=rxjs-${stamp}`)).pagination.total, 1, 'tag name search');
    assert.equal((await get('?search=$lookup')).pagination.total, 1, 'regex chars escaped');
    assert.equal((await get(`?folder=${folderA._id}`)).pagination.total, 2);
    assert.equal((await get(`?folder=${folderA._id}&favorite=true`)).pagination.total, 1);
    assert.equal((await get(`?tags=${tag1._id}`)).pagination.total, 1);
    assert.deepEqual((await get('?sort=az')).notes.map((n) => n.title), ['Angular Signals', 'b debugging', 'C mongo']);
    assert.deepEqual((await get('?sort=za')).notes.map((n) => n.title), ['C mongo', 'b debugging', 'Angular Signals']);
    assert.equal((await get('?sort=oldest')).notes[0].title, 'Angular Signals');
    assert.equal((await get('?sort=newest')).notes[0].title, 'C mongo');
    assert.equal((await get('?sort=updated&limit=1&page=2')).notes.length, 1, 'pagination');
  });

  await test('deleting a tag removes it from notes without deleting them', async () => {
    assert.equal((await call('DELETE', `/tags/${tag1._id}`, null, tokenA)).status, 200);
    const n = (await call('GET', `/notes/${note._id}`, null, tokenA)).body.data.note;
    assert.equal(n.tags.length, 0);
  });

  await test('deleting a folder clears it from notes without deleting them', async () => {
    assert.equal((await call('DELETE', `/folders/${folderA._id}`, null, tokenA)).status, 200);
    const n = (await call('GET', `/notes/${note._id}`, null, tokenA)).body.data.note;
    assert.equal(n.folder, null);
    assert.equal((await call('GET', '/notes', null, tokenA)).body.data.pagination.total, 3);
  });

  await test('delete note, then 404', async () => {
    assert.equal((await call('DELETE', `/notes/${note._id}`, null, tokenA)).status, 200);
    assert.equal((await call('GET', `/notes/${note._id}`, null, tokenA)).status, 404);
    assert.equal((await call('DELETE', `/notes/${note._id}`, null, tokenA)).status, 404);
  });

  await test('bookmark CRUD + folder/tag still work', async () => {
    const f = (await call('POST', '/folders', { name: `f2-${stamp}` }, tokenA)).body.data.folder;
    const t = (await call('POST', '/tags', { name: `t2-${stamp}` }, tokenA)).body.data.tag;
    const b = await call('POST', '/bookmarks', { title: 'bm', url: 'https://a.dev', folder: f._id, tags: [t._id] }, tokenA);
    assert.equal(b.status, 201, b.raw);
    assert.equal(b.body.data.bookmark.folder.name, f.name);
    assert.equal((await call('PUT', `/bookmarks/${b.body.data.bookmark._id}`, { folder: '' }, tokenA)).body.data.bookmark.folder, null);
    assert.equal((await call('POST', '/bookmarks', { title: 'x', url: 'https://a.dev', tags: [tagB._id] }, tokenA)).status, 404);
    assert.equal((await call('DELETE', `/tags/${t._id}`, null, tokenA)).status, 200);
    assert.equal((await call('DELETE', `/bookmarks/${b.body.data.bookmark._id}`, null, tokenA)).status, 200);
  });
} finally {
  const users = await mongoose.connection.collection('users').find({ email: { $regex: `-${stamp}@example\\.test$` } }).toArray();
  const ids = users.map((u) => u._id);
  for (const c of ['notes', 'tags', 'folders', 'bookmarks']) await mongoose.connection.collection(c).deleteMany({ user: { $in: ids } });
  const del = await mongoose.connection.collection('users').deleteMany({ _id: { $in: ids } });
  console.log(`cleanup: removed ${del.deletedCount} test users`);
  server.kill();
}

for (const r of results) console.log(r.join(' | '));
await mongoose.disconnect();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
