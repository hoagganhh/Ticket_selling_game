import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { guestSaveFile } from './game.js';

const dataDir = path.dirname(guestSaveFile);
const accountsFile = process.env.GAME_ACCOUNTS_FILE || path.join(dataDir, 'accounts.json');
const profilesDir = path.join(path.dirname(accountsFile), 'profiles');
const secretFile = path.join(path.dirname(accountsFile), 'session.key');
const cookieName = 'hoa_tam_session';
const lifetime = 30 * 24 * 60 * 60;
let accounts;
let secret;

function readAccounts() {
  if (accounts) return accounts;
  try { accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8')); }
  catch { accounts = []; }
  if (!Array.isArray(accounts)) accounts = [];
  return accounts;
}

function writeAccounts() {
  fs.mkdirSync(path.dirname(accountsFile), { recursive: true });
  const temp = `${accountsFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(readAccounts(), null, 2), 'utf8');
  fs.renameSync(temp, accountsFile);
}

function signingSecret() {
  if (secret) return secret;
  try { secret = fs.readFileSync(secretFile); }
  catch {
    secret = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, secret, { flag: 'wx' });
  }
  return secret;
}

function keyFor(username) { return username.normalize('NFC').trim().toLocaleLowerCase('vi-VN'); }
function validate(username, password) {
  if (!/^[\p{L}\p{N}_. -]{3,24}$/u.test(username)) throw new Error('Tên tài khoản cần 3–24 ký tự: chữ, số, dấu cách, gạch dưới hoặc dấu chấm.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Mật khẩu cần từ 8 đến 128 ký tự.');
}

export function profileFile(account) { return path.join(profilesDir, `${account.id}.json`); }

export function registerAccount(username, password) {
  if (typeof username !== 'string') throw new Error('Nhập tên tài khoản.');
  username = username.normalize('NFC').trim();
  validate(username, password);
  if (readAccounts().some(item => item.key === keyFor(username))) throw new Error('Tên tài khoản đã được sử dụng.');
  const account = { id: crypto.randomUUID(), username, key: keyFor(username), salt: crypto.randomBytes(16).toString('hex') };
  account.passwordHash = crypto.scryptSync(password, account.salt, 64).toString('hex');
  fs.mkdirSync(profilesDir, { recursive: true });
  fs.copyFileSync(guestSaveFile, profileFile(account), fs.constants.COPYFILE_EXCL);
  readAccounts().push(account);
  writeAccounts();
  return account;
}

export function loginAccount(username, password) {
  const account = typeof username === 'string' && readAccounts().find(item => item.key === keyFor(username));
  if (!account || typeof password !== 'string') return null;
  const actual = crypto.scryptSync(password, account.salt, 64);
  const expected = Buffer.from(account.passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected) ? account : null;
}

export function accountFromRequest(req) {
  const cookie = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  const [body, signature] = cookie.slice(cookieName.length + 1).split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', signingSecret()).update(body).digest('base64url');
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return readAccounts().find(account => account.id === payload.id) || null;
  } catch { return null; }
}

export function sessionCookie(account) {
  const body = Buffer.from(JSON.stringify({ id: account.id, exp: Date.now() + lifetime * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', signingSecret()).update(body).digest('base64url');
  return `${cookieName}=${body}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${lifetime}`;
}

export function clearSessionCookie() {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
