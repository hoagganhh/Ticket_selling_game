// Explicit, one-time import of a private backup. Never run automatically on deploy.
import fs from 'node:fs';
import path from 'node:path';
import { createStore, dataDir } from '../backend/storage.js';

if (!process.env.DATABASE_URL) throw new Error('Cần cấu hình DATABASE_URL của database đích.');
const source = process.env.LEGACY_DATA_DIR || dataDir;
const accounts = JSON.parse(fs.readFileSync(path.join(source, 'accounts.json'), 'utf8'));
if (!Array.isArray(accounts)) throw new Error('Bản sao lưu tài khoản không hợp lệ.');
const store = await createStore();
let imported = 0, skipped = 0;
try {
  for (const account of accounts) {
    if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(account.id) || !account.key || !account.passwordHash || !account.salt) throw new Error('Bản sao lưu tài khoản không hợp lệ.');
    const existing = await store.accountByKey(account.key);
    if (existing) {
      if (existing.id !== account.id) throw new Error('Database đã có tài khoản trùng tên khác ID. Dừng nhập để tránh ghi đè.');
      skipped++;
      continue;
    }
    const snapshot = JSON.parse(fs.readFileSync(path.join(source, 'profiles', `${account.id}.json`), 'utf8'));
    if (!snapshot.version || !snapshot.stock || !Array.isArray(snapshot.queue)) throw new Error('Bản lưu không hợp lệ.');
    await store.createAccount(account, snapshot);
    imported++;
  }
  console.log(`Đã nhập ${imported} tài khoản và tiến trình; bỏ qua ${skipped} tài khoản đã nhập. Bản sao lưu gốc được giữ nguyên.`);
} finally { await store.close(); }
