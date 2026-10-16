import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, getPublicState, guestSaveFile, saveNow, useSaveFile } from './game.js';
import { accountFromRequest, clearSessionCookie, loginAccount, profileFile, registerAccount, sessionCookie } from './accounts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json' };

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(value));
}

function selectGame(req) {
  const account = accountFromRequest(req);
  useSaveFile(account ? profileFile(account) : guestSaveFile);
  return account;
}

export const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/session' && req.method === 'GET') {
    const account = selectGame(req);
    return sendJson(res, 200, { loggedIn: !!account, username: account?.username || null });
  }
  if (url.pathname === '/api/state' && req.method === 'GET') {
    selectGame(req);
    return sendJson(res, 200, getPublicState());
  }
  if (url.pathname === '/api/auth' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 16384) req.destroy(); });
    req.on('end', () => {
      try {
        const { type, username, password } = JSON.parse(body || '{}');
        if (type === 'logout') return sendJson(res, 200, { loggedIn: false, username: null }, { 'Set-Cookie': clearSessionCookie() });
        let account;
        if (type === 'register') {
          useSaveFile(guestSaveFile);
          saveNow();
          account = registerAccount(username, password);
        } else if (type === 'login') {
          account = loginAccount(username, password);
          if (!account) return sendJson(res, 401, { error: 'Tên tài khoản hoặc mật khẩu không đúng.' });
        } else return sendJson(res, 400, { error: 'Thao tác tài khoản không hợp lệ.' });
        return sendJson(res, 200, { loggedIn: true, username: account.username }, { 'Set-Cookie': sessionCookie(account) });
      } catch (error) { return sendJson(res, 400, { error: error.message || 'Không thể xử lý tài khoản.' }); }
    });
    return;
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 16384) req.destroy();
    });
    req.on('end', () => {
      try {
        selectGame(req);
        const parsed = JSON.parse(body || '{}');
        if (typeof parsed.type !== 'string') return sendJson(res, 400, { error: 'Thiếu hành động.' });
        return sendJson(res, 200, act(parsed.type, parsed.payload || {}));
      } catch {
        return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ.' });
      }
    });
    return;
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
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cổng ${port} đang được ứng dụng khác sử dụng. Hãy đóng server cũ hoặc chạy với PORT khác.`);
  } else {
    console.error(`Không thể mở server: ${error.message}`);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
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
  console.log('Dùng http://, không dùng https://. Giữ cửa sổ npm start mở khi chơi.');
});
