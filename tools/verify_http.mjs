import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const folder = path.dirname(fileURLToPath(import.meta.url));
const temp = fs.mkdtempSync(path.join(folder, '.test-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
process.env.GAME_ACCOUNTS_FILE = path.join(temp, 'accounts.json');
process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
const { server } = await import('../backend/server.js');
try {
  if (!server.listening) await once(server, 'listening');
  const port = server.address().port;
  const request = (pathname, headers = {}, method = 'GET', body = null) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, headers, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('HTTP test timed out')));
    req.end(body);
  });
  const post = (pathname, value, cookie = '') => request(pathname, { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, 'POST', JSON.stringify(value));
  const audioPath = '/assets/hoa-tam-background.wav';
  const full = await request(audioPath);
  assert.equal(full.status, 200);
  assert.equal(full.headers['accept-ranges'], 'bytes');
  assert.equal(Number(full.headers['content-length']), full.body.length);
  assert.equal(full.body.subarray(0, 4).toString(), 'RIFF');
  const partial = await request(audioPath, { Range: 'bytes=0-1023' });
  assert.equal(partial.status, 206);
  assert.equal(partial.body.length, 1024);
  assert.equal(partial.headers['content-range'], `bytes 0-1023/${full.body.length}`);
  assert.deepEqual(partial.body, full.body.subarray(0, 1024));
  const suffix = await request(audioPath, { Range: 'bytes=-100' });
  assert.equal(suffix.status, 206);
  assert.deepEqual(suffix.body, full.body.subarray(-100));
  assert.equal((await request(audioPath, { Range: 'bytes=99999999-' })).status, 416);
  const head = await request(audioPath, {}, 'HEAD');
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), full.body.length);
  for (const effect of ['click', 'handoff', 'success', 'bad']) {
    const sound = await request(`/assets/sfx/${effect}.wav`);
    assert.equal(sound.status, 200);
    assert.match(sound.headers['content-type'], /audio\/wav/);
    assert.equal(sound.body.subarray(0, 4).toString(), 'RIFF');
  }
  assert.equal((await request('/')).status, 200);
  const state = JSON.parse((await request('/api/state')).body.toString());
  assert.equal(state.artists.length, 34);
  await post('/api/action', { type: 'restockMerch', payload: { id: 'lightstick' } });
  const registered = await post('/api/auth', { type: 'register', username: 'Nguoi Choi', password: 'matkhau123' });
  assert.equal(registered.status, 200);
  const cookie = registered.headers['set-cookie'][0].split(';')[0];
  assert.equal(JSON.parse((await request('/api/session', { Cookie: cookie })).body).username, 'Nguoi Choi');
  assert.equal(JSON.parse((await request('/api/state', { Cookie: cookie })).body).cash, 2700000);
  await post('/api/action', { type: 'reset' }, cookie);
  assert.equal(JSON.parse((await request('/api/state', { Cookie: cookie })).body).cash, 3000000);
  assert.equal(JSON.parse((await request('/api/state')).body).cash, 2700000, 'guest progress remains separate');
  assert.equal((await post('/api/auth', { type: 'login', username: 'Nguoi Choi', password: 'wrongpass' })).status, 401);
  const signedIn = await post('/api/auth', { type: 'login', username: 'nguoi choi', password: 'matkhau123' });
  assert.equal(signedIn.status, 200);
  assert.equal(JSON.parse((await request('/api/state', { Cookie: signedIn.headers['set-cookie'][0].split(';')[0] })).body).cash, 3000000);
  assert.equal(JSON.parse((await post('/api/auth', { type: 'logout' })).body).loggedIn, false);
  console.log('PASS: HTTP game/audio ranges, local account login/logout and isolated saved progress.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}
