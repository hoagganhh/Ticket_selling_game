import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const temp = fs.mkdtempSync(path.join(testRoot, '.test-rules-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
const realNow = Date.now, realRandom = Math.random;
let now = realNow(), fixtureId = 0;
Date.now = () => now;
Math.random = () => .5;
try {
  const base = structuredClone((await import('../backend/game.js?rules-base')).getPublicState());
  const customer = (id = 1, qty = 1) => ({ id, artistId: 1, name: `Khách ${id}`, zoneId: 'cui-lua', qty, kind: 'normal', scanned: true, resolved: false, patience: 100, merchId: 'lightstick', merchReceived: false });
  async function fixture(overrides = {}) {
    fs.writeFileSync(process.env.GAME_SAVE_FILE, JSON.stringify({ ...base, phase: 'playing', paused: true, pausedAt: now, lastTick: now, nextSpawnAt: now + 1000000, nextIncidentAt: now + 1000000, ...overrides }));
    const game = await import(`../backend/game.js?rules-${++fixtureId}`);
    game.act('resume');
    return game;
  }

  let g = await fixture({ reputation: 50 });
  now += 10000;
  assert.equal(g.getPublicState().cash, base.cash, '50 reputation does not incur a penalty');
  g = await fixture({ reputation: 49 });
  now += 9999;
  assert.equal(g.getPublicState().cash, base.cash);
  now += 1;
  let s = g.getPublicState();
  assert.equal(s.cash, base.cash - 100000);
  assert.equal(s.reputationPenaltyPaid, 100000);
  for (let i = 0; i < 20; i++) assert.equal(g.getPublicState().cash, s.cash, 'polls do not multiply penalties');
  g.act('pause'); now += 60000;
  assert.equal(g.getPublicState().cash, s.cash, 'paused time is not charged');
  g.act('resume'); now += 10000;
  assert.equal(g.getPublicState().reputationPenaltyPaid, 200000);
  g = await fixture({ reputation: 49, cash: 50000 }); now += 10000;
  assert.equal(g.getPublicState().cash, 0, 'penalties do not make cash negative');

  g = await fixture({ reputation: 48, feedback: [{ id: 1, name: 'Khách thử', rating: 1, reply: null }] });
  now += 9000; g.getPublicState();
  s = g.act('replyFeedback', { id: 1, message: 'Quầy sẽ cải thiện.' });
  assert.equal(s.reputation, 50); assert.equal(s.lowReputationSeconds, 0);
  now += 10000; assert.equal(g.getPublicState().reputationPenaltyPaid, 0);

  g = await fixture({ reputation: 5, queue: [customer()], selectedCustomerId: 1 });
  s = g.act('sellZone', { id: 'svip' });
  assert.equal(s.phase, 'gameover'); assert.equal(s.reputation, 0); assert.equal(s.queue.length, 0);
  for (const action of ['resume', 'start', 'endDay', 'replyFeedback', 'restockTickets', 'remitTax']) {
    const after = g.act(action, { id: 'cui-lua', qty: 5 });
    assert.equal(after.phase, 'gameover'); assert.equal(after.cash, s.cash);
  }
  now += 600000;
  const reloaded = await import('../backend/game.js?rules-gameover-reload');
  assert.equal(reloaded.getPublicState().phase, 'gameover');
  s = g.act('reset'); assert.equal(s.phase, 'intro'); assert.equal(s.shift, 1); assert.equal(s.reputation, 65); assert.equal(s.cash, base.cash);
  g = await fixture({ reputation: 4, secondsLeft: 1, queue: [{ ...customer(), patience: .1 }], selectedCustomerId: 1 });
  now += 1000;
  assert.equal(g.getPublicState().phase, 'gameover', 'zero reputation takes priority over day rewards');

  g = await fixture({ cash: 10000000, queue: [customer()], selectedCustomerId: 1, merchandiseStock: { ...base.merchandiseStock, lightstick: 5 } });
  s = g.act('sellMerch'); assert.equal(s.merchandiseStock.lightstick, 4);
  s = g.act('sellZone', { id: 'cui-lua' }); assert.equal(s.stock['cui-lua'], base.stock['cui-lua'] - 1);
  g.act('pause'); s = g.act('endDay');
  assert.equal(s.phase, 'summary'); assert.equal(s.paused, false); assert.equal(s.secondsLeft, 0); assert.equal(s.queue.length, 0);
  const ended = structuredClone(s);
  s = g.act('endDay'); assert.equal(s.cash, ended.cash, 'ending twice cannot duplicate rewards');
  now += 60000; s = g.act('start');
  assert.equal(s.shift, 2); assert.deepEqual(s.stock, ended.stock); assert.equal(s.merchandiseStock.lightstick, 4);
  g.act('endDay');
  assert.equal((await import('../backend/game.js?rules-ended-reload')).getPublicState().phase, 'summary');

  g = await fixture({ cash: 10000000, stock: { ...base.stock, 'cui-lua': 1 }, queue: [customer(1), customer(2)], selectedCustomerId: 1 });
  s = g.act('sellZone', { id: 'cui-lua' });
  assert.equal(s.sold, 1); assert.equal(s.stock['cui-lua'], 0); assert.equal(s.queue.length, 0);
  assert.equal(s.stockDeparted, 1); assert.equal(s.reputation, 68, 'stock departure carries no reputation penalty');
  assert.equal(s.lastSale.qty, 1, 'ticket handoff survives the departure notification');
  assert.notEqual(s.lastSale.eventId, s.lastEvent.id);
  g = await fixture({ cash: 10000000, stock: Object.fromEntries(Object.keys(base.stock).map(id => [id, 0])), queue: [customer()], selectedCustomerId: 1, nextSpawnAt: 0 });
  s = g.getPublicState(); assert.equal(s.queue.length, 0); assert.equal(s.stockDeparted, 1);
  now += 8000; assert.equal(g.getPublicState().queue.length, 0);
  g.act('restockTickets', { id: 'cui-lua', qty: 5 }); now += 8000;
  s = g.getPublicState(); assert.equal(s.queue.length, 1); assert.equal(s.queue[0].zoneId, 'cui-lua');
  g = await fixture({ stock: { ...base.stock, 'cui-lua': 1 }, queue: [customer(1, 2)], selectedCustomerId: 1 });
  s = g.getPublicState(); assert.equal(s.queue.length, 0); assert.equal(s.stock['cui-lua'], 1);

  g = await fixture({ version: 6, secondsLeft: 137, cash: 1234567, merchandiseSold: 3 });
  s = g.getPublicState(); assert.equal(s.version, 9); assert.equal(s.secondsLeft, 137); assert.equal(s.cash, 1234567); assert.equal(s.merchandiseSold, 3);
  console.log('PASS: reputation threshold/penalty/pause/recovery, forced restart at zero, stock kept after ending a day, idempotent rewards, sold-out departures, restock arrivals and v6 migration.');
} finally {
  Date.now = realNow; Math.random = realRandom;
  assert.equal(path.dirname(path.resolve(temp)), testRoot);
  fs.rmSync(temp, { recursive: true, force: true });
}
