import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const cookieName = 'hoa_tam_session';
const lifetime = 30 * 24 * 60 * 60;
const isId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
const keyFor = username => username.normalize('NFC').trim().toLocaleLowerCase('vi-VN');

export async function createAccounts(store) {
  const secret = process.env.SESSION_SECRET || await store.signingSecret();
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET cần ít nhất 32 ký tự.');
  const sign = body => crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const newGuest = () => ({ id: crypto.randomUUID(), kind: 'guest', username: null });
  const cookieAttributes = req => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${lifetime}${req.socket?.encrypted || process.env.RENDER === 'true' || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;

  function sessionCookie(player, req) {
    const body = Buffer.from(JSON.stringify({ id: player.id, kind: player.kind, exp: Date.now() + lifetime * 1000 })).toString('base64url');
    return `${cookieName}=${body}.${sign(body)}; ${cookieAttributes(req)}`;
  }

  async function playerFromRequest(req) {
    const cookie = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
    let payload;
    try {
      const parts = cookie?.slice(cookieName.length + 1).split('.') || [];
      if (parts.length !== 2) return guestSession(req);
      const [body, signature] = parts;
      const expected = Buffer.from(sign(body)), actual = Buffer.from(signature);
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return guestSession(req);
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!isId(payload.id) || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return guestSession(req);
    } catch { return guestSession(req); }
    if (payload.kind === 'guest') return { player: { id: payload.id, kind: 'guest', username: null } };
    // Old account cookies are accepted. The old shared guest save is never reused.
    if (payload.kind && payload.kind !== 'account') return guestSession(req);
    const account = await store.accountById(payload.id);
    return account ? { player: { id: account.id, kind: 'account', username: account.username } } : guestSession(req);
  }

  function guestSession(req) {
    const player = newGuest();
    return { player, cookie: sessionCookie(player, req) };
  }

  async function registerAccount(username, password, snapshot) {
    if (typeof username !== 'string') throw new Error('Nhập tên tài khoản.');
    username = username.normalize('NFC').trim();
    if (!/^[\p{L}\p{N}_. -]{3,24}$/u.test(username)) throw new Error('Tên tài khoản cần 3–24 ký tự: chữ, số, dấu cách, gạch dưới hoặc dấu chấm.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Mật khẩu cần từ 8 đến 128 ký tự.');
    const account = { id: crypto.randomUUID(), kind: 'account', username, key: keyFor(username), salt: crypto.randomBytes(16).toString('hex') };
    account.passwordHash = (await scrypt(password, account.salt, 64)).toString('hex');
    return store.createAccount(account, snapshot);
  }

  async function loginAccount(username, password) {
    if (typeof username !== 'string' || username.length > 100 || typeof password !== 'string' || password.length > 128) return null;
    const account = await store.accountByKey(keyFor(username));
    const actual = await scrypt(password, account?.salt || 'hoa-tam-login', 64);
    if (!account) return null;
    const expected = Buffer.from(account.passwordHash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected) ? { id: account.id, kind: 'account', username: account.username } : null;
  }

  return { playerFromRequest, sessionCookie, registerAccount, loginAccount, newGuest };
}
