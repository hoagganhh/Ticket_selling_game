import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const temp = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.test-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
const realNow = Date.now;
const realRandom = Math.random;
let now = realNow();
Date.now = () => now;
Math.random = () => .5;
try {
  const { act, getPublicState } = await import('../backend/game.js?verify');
  let s = getPublicState();
  assert.equal(s.artists.length, 34);
  s = act('restockMerch', { id: 'lightstick' });
  assert.equal(s.merchandiseStock.lightstick, 5);
  assert.equal(s.cash, 2700000);
  s = act('displayMerch', { id: 'lightstick' });
  assert.equal(s.attraction, 8);
  const cash = s.cash, stock = s.stock['cui-lua'];
  s = act('restockTickets', { id: 'cui-lua', qty: -5 });
  assert.equal(s.cash, cash); assert.equal(s.stock['cui-lua'], stock);
  s = act('restockTickets', { id: 'svip', qty: 10 });
  assert.equal(s.cash, cash); // insufficient cash
  s = act('restockTickets', { id: 'cui-lua', qty: 5 });
  assert.equal(s.stock['cui-lua'], stock + 5); assert.equal(s.cash, cash - 750000);
  s = act('start');
  assert.equal(s.queue.length, 1);
  assert.equal(s.shiftSeconds, 300); assert.equal(s.gameTimeRate, 5);
  const beforeClock = s.gameSecondsElapsed; now += 1000; s = getPublicState();
  assert.equal(s.gameSecondsElapsed - beforeClock, 5); assert.equal(s.secondsLeft, 299);
  now += 2000; s = act('sellZone', { id: 'wrong-zone' });
  assert.equal(s.secondsLeft, 297, 'wrong actions still consume real time');
  now += 3000; s = getPublicState();
  assert.equal(s.secondsLeft, 294, 'idle time still consumes real time');
  s = act('pause');
  const frozen = structuredClone(s);
  now += 120000;
  s = getPublicState();
  assert.equal(s.secondsLeft, frozen.secondsLeft);
  assert.deepEqual(s.queue, frozen.queue);
  assert.equal(s.nextIncidentAt, frozen.nextIncidentAt);
  s = act('sellZone', { id: s.queue[0].zoneId });
  assert.equal(s.sold, 0); assert.deepEqual(s.stock, frozen.stock);
  s = act('resume');
  assert.equal(s.paused, false); assert.equal(s.exited, false);
  assert.equal(s.queue[0].patience, frozen.queue[0].patience);
  assert.equal(s.nextSpawnAt, frozen.nextSpawnAt + 120000);
  const beforeScanTime = s.secondsLeft; s = act('scan');
  assert.equal(s.secondsLeft, beforeScanTime); // actions do not shorten a five-minute day
  const beforeMerch = s.merchandiseStock.lightstick;
  s = act('sellMerch');
  assert.equal(s.merchandiseStock.lightstick, beforeMerch - 1);
  assert.equal(s.merchandiseSold, 1);
  assert.equal(s.queue[0].merchReceived, true);
  const moneyAfterMerch = s.cash;
  s = act('sellMerch'); assert.equal(s.cash, moneyAfterMerch);
  s = act('sellZone', { id: s.queue[0].zoneId });
  assert.equal(s.sold, 1);
  const audiences = new Set();
  for (let turn = 0; turn < 45; turn++) {
    now += 8500;
    s = getPublicState();
    if (s.phase === 'summary') {
      s = act('unlockArtist', { slot: Object.keys(s.artistSlots).length + 1 });
      s = act('start');
    }
    if (s.phase === 'complete') break;
    for (const c of [...s.queue]) {
      audiences.add(c.guestId || 'artist');
      s = act('selectCustomer', { id: c.id });
      s = act('scan');
      s = act('sellZone', { id: c.zoneId });
      if (c.guestId) assert.equal(s.feedback[0].guestId, c.guestId);
    }
  }
  assert.ok(audiences.has('artist'));
  assert.ok([...audiences].filter(x => typeof x === 'number').length >= 10);
  assert.equal(s.artists.length, 34);
  s = act('pause');
  const saved = JSON.parse(fs.readFileSync(process.env.GAME_SAVE_FILE));
  const restored = await import('../backend/game.js?restore');
  now += 600000;
  assert.equal(restored.getPublicState().secondsLeft, saved.secondsLeft);
  assert.equal(restored.getPublicState().paused, true);
  // Upgrade an existing v4 save while preserving money, stock, and achievements.
  saved.version = 4; saved.phase = 'playing'; saved.paused = false; saved.secondsLeft = 45; saved.lastTick = now;
  fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify(saved));
  const migrated = (await import('../backend/game.js?migration')).getPublicState();
  assert.equal(migrated.version, 9); assert.equal(migrated.paused, false);
  assert.equal(migrated.cash, saved.cash); assert.deepEqual(migrated.stock, saved.stock);
  assert.equal(migrated.sold, saved.sold); assert.equal(migrated.secondsLeft, 150);
  const runningSave = JSON.parse(fs.readFileSync(process.env.GAME_SAVE_FILE));
  runningSave.phase = 'playing'; runningSave.paused = false; runningSave.secondsLeft = 150; runningSave.lastTick = now - 10000;
  fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify(runningSave));
  const reopened = (await import('../backend/game.js?running-restart')).getPublicState();
  assert.equal(reopened.paused, false, 'reopening does not automatically pause a shift');
  assert.equal(reopened.secondsLeft, 140, 'time away from the page counts toward the shift');
  s = act('reset');
  assert.equal(s.collectedArtists.length, 0);
  assert.equal(s.pendingReveals, 0);
  assert.deepEqual(s.artistSlots, {});
  s = act('start');
  now += 299999; s = getPublicState();
  assert.equal(s.phase, 'playing');
  assert.ok(s.secondsLeft > 0 && s.secondsLeft < .002);
  now += 1; s = getPublicState();
  assert.equal(s.phase, 'summary'); assert.equal(s.secondsLeft, 0);
  assert.equal(s.gameSecondsElapsed, 1500);
  assert.equal(s.collectedArtists.length, 0);
  assert.equal(s.pendingReveals, 1);
  s = act('start'); assert.equal(s.secondsLeft, 300); assert.equal(s.gameSecondsElapsed, 0);
  console.log('PASS: five-minute days, idle and error countdown, 5x game clock, proportional time migration, explicit pause/resume, saved progress, v4 migration, inventory costs/limits, merchandise sale, new guests and exactly 34 artists.');
} finally {
  Date.now = realNow; Math.random = realRandom;
  fs.rmSync(temp, { recursive: true, force: true });
}
