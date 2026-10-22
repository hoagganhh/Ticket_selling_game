import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createGame } from './game.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = process.env.GAME_DATA_DIR || (process.env.GAME_SAVE_FILE ? path.dirname(process.env.GAME_SAVE_FILE) : path.join(here, 'data'));
const accountsFile = process.env.GAME_ACCOUNTS_FILE || path.join(dataDir, 'accounts.json');
const profileDir = path.join(path.dirname(accountsFile), 'profiles');
const guestDir = path.join(path.dirname(accountsFile), 'guests');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temp, file);
}

function runGame(snapshot, action) {
  const game = createGame({ snapshot });
  const result = action(game);
  if (result?.then) throw new Error('Game actions must complete synchronously.');
  return { result, snapshot: game.snapshot() };
}

function fileStore() {
  const readAccounts = () => readJson(accountsFile, []);
  return {
    kind: 'files',
    async signingSecret() {
      // Rotate the signing key used by the old shared-save release.
      const file = path.join(path.dirname(accountsFile), 'sessions-v2.key');
      try { return fs.readFileSync(file); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const secret = crypto.randomBytes(32);
        try { fs.writeFileSync(file, secret, { flag: 'wx', mode: 0o600 }); }
        catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; }
        return fs.readFileSync(file);
      }
    },
    async accountById(id) { return readAccounts().find(account => account.id === id) || null; },
    async accountByKey(key) { return readAccounts().find(account => account.key === key) || null; },
    async createAccount(account, snapshot) {
      const accounts = readAccounts();
      if (accounts.some(item => item.key === account.key)) throw new Error('Tên tài khoản đã được sử dụng.');
      writeJson(path.join(profileDir, `${account.id}.json`), snapshot || createGame().snapshot());
      accounts.push(account);
      writeJson(accountsFile, accounts);
      return account;
    },
    async withGame(player, action) {
      const file = path.join(player.kind === 'account' ? profileDir : guestDir, `${player.id}.json`);
      const { result, snapshot } = runGame(readJson(file, null), action);
      writeJson(file, snapshot);
      return result;
    },
    async close() {}
  };
}

async function postgresStore(connectionString) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 10000 });
  pool.on('error', () => console.error('Kết nối PostgreSQL bị gián đoạn. Đang chờ kết nối lại.'));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hoa_tam_accounts (
      id UUID PRIMARY KEY, username TEXT NOT NULL, key TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hoa_tam_players (
      id UUID PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('guest', 'account')),
      state JSONB, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hoa_tam_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const accountFromRow = row => row ? { id: row.id, username: row.username, key: row.key, salt: row.salt, passwordHash: row.password_hash } : null;
  return {
    kind: 'postgres',
    async signingSecret() {
      await pool.query('INSERT INTO hoa_tam_settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['session-secret', crypto.randomBytes(32).toString('hex')]);
      return (await pool.query('SELECT value FROM hoa_tam_settings WHERE key = $1', ['session-secret'])).rows[0].value;
    },
    async accountById(id) { return accountFromRow((await pool.query('SELECT * FROM hoa_tam_accounts WHERE id = $1', [id])).rows[0]); },
    async accountByKey(key) { return accountFromRow((await pool.query('SELECT * FROM hoa_tam_accounts WHERE key = $1', [key])).rows[0]); },
    async createAccount(account, snapshot) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO hoa_tam_accounts (id, username, key, salt, password_hash) VALUES ($1, $2, $3, $4, $5)', [account.id, account.username, account.key, account.salt, account.passwordHash]);
        await client.query('INSERT INTO hoa_tam_players (id, kind, state) VALUES ($1, $2, $3)', [account.id, 'account', snapshot || createGame().snapshot()]);
        await client.query('COMMIT');
        return account;
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') throw new Error('Tên tài khoản đã được sử dụng.');
        throw error;
      } finally { client.release(); }
    },
    async withGame(player, action) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO hoa_tam_players (id, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING', [player.id, player.kind]);
        // The row lock also protects two requests from the same player on different servers.
        const row = (await client.query('SELECT kind, state FROM hoa_tam_players WHERE id = $1 FOR UPDATE', [player.id])).rows[0];
        if (row.kind !== player.kind) throw new Error('Phiên người chơi không hợp lệ.');
        const { result, snapshot } = runGame(row.state, action);
        await client.query('UPDATE hoa_tam_players SET state = $2, updated_at = NOW() WHERE id = $1', [player.id, snapshot]);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async close() { await pool.end(); }
  };
}

export async function createStore() {
  return process.env.DATABASE_URL ? postgresStore(process.env.DATABASE_URL) : fileStore();
}
