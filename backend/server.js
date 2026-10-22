import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './storage.js';
import { createAccounts } from './accounts.js';

export const store = await createStore();
const accounts = await createAccounts(store);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json' };

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(value));
}

const publicSession = player => ({ loggedIn: player.kind === 'account', username: player.username, playerId: player.id });

async function selectPlayer(req, res) {
  const session = await accounts.playerFromRequest(req);
  if (session.cookie) res.setHeader('Set-Cookie', session.cookie);
  return session.player;
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 16384) throw new Error('Dữ liệu gửi lên quá lớn.');
  }
  try {
    const value = JSON.parse(body || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Bad body');
    return value;
  }
  catch { throw new Error('Dữ liệu không hợp lệ.'); }
}

const authAttempts = new Map();
function allowAuth(req) {
  const now = Date.now();
  for (const [key, item] of authAttempts) if (item.until <= now) authAttempts.delete(key);
  const ip = (process.env.RENDER === 'true' ? req.headers['x-forwarded-for']?.split(',')[0] : null) || req.socket.remoteAddress;
  const item = authAttempts.get(ip) || { count: 0, until: now + 5 * 60000 };
  item.count++;
  authAttempts.set(ip, item);
  return item.count <= 30;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/healthz' && req.method === 'GET') return sendJson(res, 200, { status: 'ok' });
  if (url.pathname.startsWith('/api/') && req.method === 'POST' && req.headers.origin) {
    if (new URL(req.headers.origin).host !== req.headers.host) return sendJson(res, 403, { error: 'Yêu cầu không cùng nguồn với game.' });
  }
  if (url.pathname === '/api/session' && req.method === 'GET') {
    return sendJson(res, 200, publicSession(await selectPlayer(req, res)));
  }
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const player = await selectPlayer(req, res);
    const state = await store.withGame(player, game => game.getPublicState());
    return sendJson(res, 200, { ...state, ...publicSession(player) });
  }
  if (url.pathname === '/api/auth' && req.method === 'POST') {
    const { type, username, password } = await readBody(req);
    let player;
    if (type === 'logout') player = accounts.newGuest();
    else {
      if (!allowAuth(req)) return sendJson(res, 429, { error: 'Bạn thử đăng nhập quá nhiều lần. Hãy thử lại sau 5 phút.' }, { 'Retry-After': '300' });
      if (type === 'register') {
        const current = await selectPlayer(req, res);
        if (current.kind === 'account') return sendJson(res, 409, { error: 'Hãy đăng xuất trước khi tạo tài khoản khác.' });
        const snapshot = await store.withGame(current, game => game.snapshot());
        player = await accounts.registerAccount(username, password, snapshot);
      } else if (type === 'login') {
        player = await accounts.loginAccount(username, password);
        if (!player) return sendJson(res, 401, { error: 'Tên tài khoản hoặc mật khẩu không đúng.' });
      } else return sendJson(res, 400, { error: 'Thao tác tài khoản không hợp lệ.' });
    }
    return sendJson(res, 200, publicSession(player), { 'Set-Cookie': accounts.sessionCookie(player, req) });
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    const parsed = await readBody(req);
    const player = await selectPlayer(req, res);
    if (req.headers['x-player-id'] !== player.id) return sendJson(res, 409, { error: 'Phiên chơi đã thay đổi. Đang tải lại tiến trình của bạn.' });
    if (typeof parsed.type !== 'string') return sendJson(res, 400, { error: 'Thiếu hành động.' });
    if (parsed.payload != null && (typeof parsed.payload !== 'object' || Array.isArray(parsed.payload))) return sendJson(res, 400, { error: 'Dữ liệu hành động không hợp lệ.' });
    const state = await store.withGame(player, game => game.act(parsed.type, parsed.payload || {}));
    return sendJson(res, 200, { ...state, ...publicSession(player) });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'Bad path' }); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return sendJson(res, 403, { error: 'Forbidden' });
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return sendJson(res, 404, { error: 'Not found' });
    const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      if (!range[1]) start = Math.max(0, stat.size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || !stat.size) return res.end();
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
}

export const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    if (res.headersSent) return res.destroy();
    const inputError = /^(Tên tài khoản|Mật khẩu|Nhập tên|Dữ liệu)/.test(error.message);
    if (!inputError) console.error('Không thể xử lý yêu cầu game.', error.code || error.name);
    sendJson(res, inputError ? 400 : 503, { error: inputError ? error.message : 'Máy chủ chưa lưu được tiến trình. Hãy thử lại sau.' });
  });
});

server.on('close', () => { store.close().catch(() => {}); });

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cổng ${port} đang được ứng dụng khác sử dụng. Hãy đóng server cũ hoặc chạy với PORT khác.`);
  } else {
    console.error(`Không thể mở server: ${error.message}`);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Lưu dữ liệu: ${store.kind === 'postgres' ? 'PostgreSQL' : 'file riêng theo từng người chơi'}.`);
  if (process.env.RENDER === 'true' && store.kind === 'files') console.warn('Chưa cấu hình DATABASE_URL. File trên Render không được giữ qua deploy nếu không gắn Persistent Disk.');
  console.log(`Hỏa Tâm Box Office đã chạy tại http://localhost:${port}/`);
  if (host === '0.0.0.0' || host === '::') {
    const addresses = Object.values(os.networkInterfaces()).flat()
      .filter(address => address && address.family === 'IPv4' && !address.internal)
      .map(address => address.address);
    for (const address of new Set(addresses)) {
      console.log(`Điện thoại cùng Wi-Fi: http://${address}:${port}/`);
    }
  } else if (host !== 'localhost' && host !== '127.0.0.1') {
    console.log(`Mạng nội bộ: http://${host}:${port}/`);
  }
  if (process.env.RENDER !== 'true') console.log('Mạng nội bộ dùng http://. Khi triển khai trên Render, dùng link HTTPS do Render cấp.');
});
