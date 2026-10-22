import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import crypto from 'node:crypto';

const folder = path.dirname(fileURLToPath(import.meta.url));
const temp = fs.mkdtempSync(path.join(folder, '.test-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
process.env.GAME_ACCOUNTS_FILE = path.join(temp, 'accounts.json');
delete process.env.DATABASE_URL;
delete process.env.RENDER;
process.env.SESSION_SECRET = 'http-test-only-secret-at-least-32-characters';
process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
let { server } = await import('../backend/server.js');
try {
  if (!server.listening) await once(server, 'listening');
  let port = server.address().port;
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
  const browser = () => ({
    cookie: '', playerId: null,
    async call(pathname, value) {
      const response = await request(pathname, { Cookie: this.cookie, 'Content-Type': 'application/json', 'X-Player-ID': this.playerId || '' }, value ? 'POST' : 'GET', value ? JSON.stringify(value) : null);
      const cookies = response.headers['set-cookie'];
      if (cookies) this.cookie = cookies[0].split(';')[0];
      const data = JSON.parse(response.body);
      if (data.playerId) this.playerId = data.playerId;
      return { ...response, data };
    },
    async state() { const res = await this.call('/api/state'); assert.equal(res.status, 200); return res.data; },
    async action(type, payload) { const res = await this.call('/api/action', { type, payload }); assert.equal(res.status, 200); return res.data; },
    async auth(type, username, password = 'matkhau123') { return this.call('/api/auth', { type, username, password }); }
  });
  // A previously shared save must never become a template for new visitors.
  const { createGame } = await import('../backend/game.js');
  const legacyShared = createGame().snapshot();
  legacyShared.cash = 99000000;
  fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify(legacyShared));
  const a = browser(), b = browser(), c = browser();
  await Promise.all([a.call('/api/session'), b.call('/api/session')]);
  assert.notEqual(a.cookie, b.cookie);
  const states = await Promise.all([a.state(), b.state()]);
  assert.equal(states[0].cash, 3000000);
  assert.equal(states[0].artists.length, 34);
  assert.equal(states[1].cash, 3000000);
  assert.match((await a.call('/api/session')).headers['cache-control'], /no-store/);
  await a.action('restockMerch', { id: 'lightstick' });
  await b.action('restockMerch', { id: 'banner' });
  assert.equal((await b.state()).cash, 2850000);
  assert.equal((await a.state()).cash, 2700000);
  await Promise.all([
    a.action('restockMerch', { id: 'lightstick' }), a.action('restockMerch', { id: 'lightstick' }),
    b.action('restockMerch', { id: 'banner' }), b.action('restockMerch', { id: 'banner' })
  ]);
  assert.equal((await a.state()).cash, 2100000);
  assert.equal((await b.state()).cash, 2550000);
  assert.equal((await a.auth('register', 'Nguoi Choi A')).status, 200);
  assert.equal((await b.auth('register', 'Nguoi Choi B')).status, 200);
  assert.equal((await a.state()).cash, 2100000, 'registration keeps only this guest’s progress');
  assert.equal((await b.state()).cash, 2550000);
  assert.equal((await c.state()).cash, 3000000, 'new visitor never inherits account A or B');
  assert.equal((await c.auth('register', 'nguoi choi a')).status, 400, 'account names are unique after normalization');
  assert.equal((await c.auth('login', 'Nguoi Choi A', 'wrongpass')).status, 401);
  await a.action('start');
  await a.action('endDay');
  const collected = await a.action('unlockArtist', { slot: 1 });
  assert.equal(collected.collectedArtists.length, 1);
  assert.equal((await b.state()).collectedArtists.length, 0);
  assert.equal((await b.state()).phase, 'intro');
  const secondDevice = browser();
  assert.equal((await secondDevice.auth('login', 'nguoi choi a')).status, 200);
  assert.deepEqual((await secondDevice.state()).collectedArtists, collected.collectedArtists);
  await secondDevice.action('reset');
  assert.equal((await a.state()).collectedArtists.length, 0);
  assert.equal((await b.state()).cash, 2550000, 'resetting A never affects B');
  const priorId = a.playerId;
  const logout = await a.auth('logout');
  assert.equal(logout.data.loggedIn, false);
  assert.notEqual(a.playerId, priorId);
  assert.equal((await a.state()).cash, 3000000);
  const stale = await request('/api/action', { Cookie: a.cookie, 'Content-Type': 'application/json', 'X-Player-ID': priorId }, 'POST', JSON.stringify({ type: 'restockMerch', payload: { id: 'shirt' } }));
  assert.equal(stale.status, 409, 'a stale tab cannot change the newly selected player');
  assert.equal((await a.state()).cash, 3000000);
  await a.auth('login', 'Nguoi Choi A');
  const forged = browser();
  const token = a.cookie.split('=')[1].split('.');
  const claims = JSON.parse(Buffer.from(token[0], 'base64url'));
  claims.id = b.playerId;
  forged.cookie = `hoa_tam_session=${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${token[1]}`;
  assert.equal((await forged.state()).cash, 3000000);
  assert.notEqual(forged.playerId, b.playerId, 'an unsigned account change is rejected');
  const expired = browser();
  const body = Buffer.from(JSON.stringify({ id: b.playerId, kind: 'account', exp: Date.now() - 1000 })).toString('base64url');
  expired.cookie = `hoa_tam_session=${body}.${crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url')}`;
  assert.notEqual((await expired.state()).playerId, b.playerId);
  const otherOrigin = await request('/api/action', { Cookie: a.cookie, Origin: 'https://another-site.example', 'Content-Type': 'application/json', 'X-Player-ID': a.playerId }, 'POST', JSON.stringify({ type: 'reset' }));
  assert.equal(otherOrigin.status, 403);
  assert.equal((await request('/healthz')).headers['set-cookie'], undefined);
  assert.equal((await request('/backend/data/accounts.json')).status, 404);
  const secure = await post('/api/auth', { type: 'logout' });
  assert.match(secure.headers['set-cookie'][0], /HttpOnly; SameSite=Lax/);
  const https = await request('/api/session', { 'X-Forwarded-Proto': 'https' });
  assert.match(https.headers['set-cookie'][0], /; Secure/);
  const corruptPath = path.join(temp, 'profiles', `${b.playerId}.json`);
  const backup = fs.readFileSync(corruptPath);
  fs.writeFileSync(corruptPath, '{broken');
  assert.equal((await b.call('/api/state')).status, 503, 'a damaged save is not silently replaced');
  assert.equal(fs.readFileSync(corruptPath, 'utf8'), '{broken');
  fs.writeFileSync(corruptPath, backup);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  ({ server } = await import('../backend/server.js?restart'));
  if (!server.listening) await once(server, 'listening');
  port = server.address().port;
  assert.equal((await b.state()).cash, 2550000, 'account progress survives a server restart');
  assert.equal((await b.call('/api/session')).data.loggedIn, true);
  assert.equal((await c.state()).cash, 3000000, 'guest identity survives a restart');
  console.log('PASS: separate guests/accounts, concurrent players, own guest migration, second device, restart persistence, reset/logout isolation, stale tabs, cookie tampering, HTTPS and audio.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}
