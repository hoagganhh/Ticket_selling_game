import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolsRoot, '..');
const temp = fs.mkdtempSync(path.join(toolsRoot, '.test-collection-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
const realNow = Date.now, realRandom = Math.random;
let now = realNow();
Date.now = () => now;
Math.random = () => .73;
try {
  const { act, getPublicState } = await import('../backend/game.js?collection');
  let s = getPublicState();
  assert.equal(s.collectedArtists.length, 0);
  assert.equal(s.gaiConBadge, false);
  for (let day = 1; day <= 34; day++) {
    if (s.phase === 'complete') {
      const previousStock = structuredClone(s.stock);
      const previousCash = s.cash;
      s = act('nextCampaign');
      assert.equal(s.phase, 'intro');
      assert.deepEqual(s.stock, previousStock);
      assert.equal(s.cash, previousCash);
    }
    s = act('start');
    assert.equal(s.phase, 'playing');
    s = act('endDay');
    assert.equal(s.collectedArtists.length, day - 1, 'artist identity stays hidden after the day ends');
    assert.equal(s.pendingReveals, 1, 'one mystery card choice is earned per day');
    const chosenSlot = 35 - day;
    s = act('unlockArtist', { slot: chosenSlot });
    assert.equal(s.collectedArtists.length, day, 'one artist is revealed only after choosing a card');
    assert.equal(s.artistSlots[chosenSlot], s.collectedArtists.at(-1));
    assert.equal(s.pendingReveals, 0);
    assert.equal(new Set(s.collectedArtists).size, day, 'rewards never repeat');
    assert.equal(s.lastCollectionReward.artistId, s.collectedArtists.at(-1));
    const reward = s.lastCollectionReward;
    const id = String(reward.artistId).padStart(2, '0');
    assert.ok(fs.existsSync(path.join(projectRoot, 'frontend', 'assets', 'chibi', `${id}.svg`)));
    assert.ok(fs.existsSync(path.join(projectRoot, 'frontend', 'assets', 'chibi-full', `${id}.svg`)));
    const beforeRepeat = structuredClone(s.collectedArtists);
    s = act('endDay');
    assert.deepEqual(s.collectedArtists, beforeRepeat, 'repeated end-day cannot farm a second reward');
    s = act('unlockArtist', { slot: day });
    assert.deepEqual(s.collectedArtists, beforeRepeat, 'repeated card selection cannot farm another reward');
    assert.equal(s.gaiConBadge, day === 34);
    if (day !== 34 && s.phase === 'summary') s = act('start');
  }
  assert.equal(s.unlockedArtists, 34);
  assert.ok(s.gaiConUnlockedAt);
  const earnedSave = JSON.parse(fs.readFileSync(process.env.GAME_SAVE_FILE, 'utf8'));
  s = act('reset');
  assert.equal(s.phase, 'intro'); assert.equal(s.shift, 1);
  assert.equal(s.collectedArtists.length, 0); assert.equal(s.gaiConBadge, false); assert.equal(s.gaiConUnlockedAt, null);
  assert.equal(s.pendingReveals, 0); assert.equal(Object.keys(s.artistSlots).length, 0);
  const saved = JSON.parse(fs.readFileSync(process.env.GAME_SAVE_FILE, 'utf8'));
  s = (await import('../backend/game.js?collection-reload')).getPublicState();
  assert.deepEqual(s.collectedArtists, saved.collectedArtists);
  assert.equal(s.gaiConBadge, false);
  const oldOwned = { ...earnedSave, version: 8, phase: 'summary', collectedArtists: [2, 5], artistSlots: undefined, pendingReveals: undefined,
    queue: [{ id: 88, artistId: 3, name: 'Hoàng Tôn', zoneId: 'hoa-tam', qty: 1, patience: 100 }] };
  fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify(oldOwned));
  s = (await import('../backend/game.js?collection-v8')).getPublicState();
  assert.equal(s.version, 9);
  assert.deepEqual(s.artistSlots, { 1: 2, 2: 5 });
  assert.equal(s.pendingReveals, 0);
  assert.ok(s.queue[0].guestId, 'a previously queued locked artist becomes a guest after migration');
  for (let id = 1; id <= 12; id++) {
    const prefix = String(id).padStart(2, '0');
    assert.ok(fs.existsSync(path.join(projectRoot, 'frontend', 'assets', 'guests', `${prefix}.svg`)));
    assert.ok(fs.existsSync(path.join(projectRoot, 'frontend', 'assets', 'guests', `${prefix}-full.svg`)));
  }
  const legacy = { ...earnedSave, version: 7, unlockedArtists: 34, collectedArtists: undefined, gaiConUnlockedAt: undefined, cash: 7654321 };
  fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify(legacy));
  s = (await import('../backend/game.js?collection-migration')).getPublicState();
  assert.equal(s.version, 9); assert.equal(s.collectedArtists.length, 0);
  assert.equal(s.cash, 7654321);
  console.log('PASS: mystery card choices, 34 unique artists, full reset, 12 guest chibis, badge, persistence and v7/v8 migration.');
} finally {
  Date.now = realNow; Math.random = realRandom;
  assert.equal(path.dirname(path.resolve(temp)), toolsRoot);
  fs.rmSync(temp, { recursive: true, force: true });
}
