import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const guestSaveFile = process.env.GAME_SAVE_FILE || path.join(here, 'data', 'save.json');
let saveFile = guestSaveFile;
const profileStates = new Map();

export const zones = [
  { id: 'svip', name: 'S-VIP', price: 10000000, stock: 5, color: '#d7f63c', group: 'Đặc biệt' },
  { id: 'bach-ma', name: 'Bạch Mã', price: 4000000, stock: 10, color: '#ebe1ce', group: 'Đứng' },
  { id: 'hac-ma', name: 'Hắc Mã', price: 4000000, stock: 10, color: '#00ac83', group: 'Đứng' },
  { id: 'ngoai-o', name: 'Ngoại Ô', price: 3500000, stock: 10, color: '#a51c70', group: 'Ngồi' },
  { id: 'vinh-quy', name: 'Vinh Quy', price: 3000000, stock: 12, color: '#9b6df0', group: 'Ngồi' },
  { id: 'hoa-tam', name: 'Hỏa Tâm', price: 3000000, stock: 12, color: '#c2772f', group: 'Đứng' },
  { id: 'soan-nhac', name: 'Soạn Nhạc', price: 2500000, stock: 14, color: '#46b9ed', group: 'Ngồi' },
  { id: 'hoa-lua', name: 'Hoa Lửa', price: 2500000, stock: 12, color: '#20b890', group: 'Ngồi' },
  { id: 'my-nam', name: 'Mỹ Nam', price: 2000000, stock: 14, color: '#175879', group: 'Ngồi' },
  { id: 'hoa-lenh', name: 'Hỏa Lệnh', price: 2000000, stock: 14, color: '#f37524', group: 'Đứng' },
  { id: 'lam-manh', name: 'Làm Mạnh', price: 2000000, stock: 14, color: '#278ce2', group: 'Ngồi' },
  { id: 'chien-tuong', name: 'Chiến Tướng', price: 1500000, stock: 14, color: '#00b5bc', group: 'Đứng' },
  { id: 'dien-anh', name: 'Điện Ảnh', price: 1500000, stock: 16, color: '#ffdc23', group: 'Ngồi' },
  { id: 'hoa-loc', name: 'Hỏa Lộc', price: 1500000, stock: 16, color: '#182e63', group: 'Ngồi' },
  { id: 'ky-si', name: 'Kỵ Sĩ', price: 1000000, stock: 18, color: '#204a98', group: 'Đứng' },
  { id: 'cui-lua', name: 'Củi Lửa', price: 1000000, stock: 18, color: '#ffc520', group: 'Ngồi' }
];

export const artists = [
  'Đại Nghĩa','Dũng DT','Nguyễn Văn Chung','Thái VG','Tùng Mint','Thanh Duy',
  'Thỏ (Da LAB)','Trịnh Thăng Bình','Hoàng Tôn','Thơm (Da LAB)','Jun Phạm',
  'Đinh Mạnh Ninh','Vương Anh Tú','Will','Mew Amazing','Neko Lê','BB Trần',
  'Hoàng Rob','Thuận Nguyễn','Huỳnh Lập','Đông Hùng','Toki Thành Thỏ',
  'It’s Charles.','Duy Khánh','Cheng','K.O','Hoàng Dũng','Lê Xuân Tiền',
  'OSAD','14 Casper','Hồ Đông Quan','Thái Lê Minh Hiếu','Hà An Huy','Phùng Minh Cương'
];

const shiftSeconds = 300; // One selling day is five real minutes.
const gameTimeRate = 5;
const totalShifts = 5;
const taxRate = 0.05; // A fictional game rule, not a real ticket tax.
const reputationRules = { threshold: 50, penalty: 100000, intervalSeconds: 10 };
const staffCosts = { checker: [2000000, 4000000], marketing: [2500000, 5000000], security: [3000000, 6000000] };
export const merchandise = [
  { id: 'lightstick', name: 'Lightstick ngọn lửa', pack: 5, cost: 300000, price: 120000, attraction: 8, icon: 'lightstick' },
  { id: 'shirt', name: 'Áo concert', pack: 5, cost: 800000, price: 250000, attraction: 12, icon: 'shirt' },
  { id: 'banner', name: 'Banner cổ vũ', pack: 5, cost: 150000, price: 60000, attraction: 6, icon: 'banner' }
];
export const guestProfiles = ['Mẹ', 'Bố', 'Em gái', 'Anh trai', 'Chị gái', 'Ông', 'Bà', 'Bạn thân', 'Đồng nghiệp', 'Bạn học', 'Nhóm bạn', 'Gia đình'];
let state;
let dirty = false;

const pick = values => values[Math.floor(Math.random() * values.length)];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const activeCustomer = s => s.queue.find(c => c.id === s.selectedCustomerId);
const missionTarget = shift => Math.min(6, shift + 2);
const note = (s, message, tone = 'info') => {
  s.lastEvent = { id: ++s.eventId, message, tone };
  s.log.unshift({ message, tone, time: new Date().toISOString() });
  s.log = s.log.slice(0, 12);
};

function freshState(collection = {}) {
  const collectedArtists = [...new Set(collection.collectedArtists || [])];
  return {
    version: 9, phase: 'intro', shift: 1, secondsLeft: shiftSeconds,
    campaign: 1, collectedArtists, artistSlots: { ...(collection.artistSlots || {}) },
    pendingReveals: collection.pendingReveals || 0, lastCollectionReward: null,
    gaiConUnlockedAt: collection.gaiConUnlockedAt || null,
    paused: false, exited: false, pausedAt: null,
    merchandiseStock: Object.fromEntries(merchandise.map(item => [item.id, 0])),
    merchandiseDisplay: Object.fromEntries(merchandise.map(item => [item.id, false])),
    merchandiseSold: 0, merchandiseRevenue: 0, suppliesSpent: 0,
    lastTick: Date.now(), nextSpawnAt: 0, cash: 3000000, revenue: 0,
    reputation: 65, sold: 0, combo: 0, bestCombo: 0, served: 0,
    lowReputationSeconds: 0, reputationPenaltyPaid: 0, stockDeparted: 0,
    missed: 0, botsStopped: 0, errors: 0, customerSeq: 0,
    shiftSales: 0, missionWon: false, tips: 0, goldenServed: 0,
    feedbackSeq: 0, feedback: [], lastSale: null,
    staff: { checker: 0, marketing: 0, security: 0 },
    taxCollected: 0, taxDue: 0, taxRemitted: 0,
    incidentSeq: 0, incident: null, nextIncidentAt: 0,
    securityCaught: 0, securityMissed: 0,
    selectedCustomerId: null, selectedZoneId: null, queue: [], artistDeck: [],
    stock: Object.fromEntries(zones.map(z => [z.id, z.stock])),
    upgrades: { scanner: 0, queue: 0, payment: 0 },
    unlockedArtists: collectedArtists.length, eventId: 0, lastEvent: null, log: []
  };
}

function save() {
  if (!dirty) return;
  fs.mkdirSync(path.dirname(saveFile), { recursive: true });
  const temp = saveFile + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(temp, saveFile); break; }
    catch (error) {
      // Windows can briefly lock the destination while indexing a save.
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 5) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  dirty = false;
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(saveFile, 'utf8'));
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(parsed.version) && parsed.stock && Array.isArray(parsed.queue)) {
      if (parsed.version === 1) {
        parsed.artistDeck = [];
        parsed.queue.forEach((customer, index) => {
          const artistId = (index % artists.length) + 1;
          customer.artistId = artistId;
          customer.name = artists[artistId - 1];
        });
        parsed.version = 2;
        dirty = true;
      }
      if (!Array.isArray(parsed.artistDeck)) parsed.artistDeck = [];
      if (parsed.version < 3) {
        parsed.version = 3;
        parsed.shiftSales = 0;
        parsed.missionWon = false;
        parsed.tips = 0;
        parsed.goldenServed = 0;
        parsed.feedbackSeq = 0;
        parsed.feedback = [];
        parsed.lastSale = null;
        dirty = true;
      }
      if (!Array.isArray(parsed.feedback)) parsed.feedback = [];
      if (parsed.version < 4) {
        parsed.version = 4;
        parsed.staff = { checker: 0, marketing: 0, security: 0 };
        parsed.taxCollected = 0;
        parsed.taxDue = 0;
        parsed.taxRemitted = 0;
        parsed.incidentSeq = 0;
        parsed.incident = null;
        parsed.nextIncidentAt = parsed.phase === 'playing' ? Date.now() + 20000 : 0;
        parsed.securityCaught = 0;
        parsed.securityMissed = 0;
        dirty = true;
      }
      if (parsed.version < 5) {
        parsed.version = 5;
        parsed.paused = false;
        parsed.exited = false;
        parsed.pausedAt = null;
        parsed.merchandiseStock = Object.fromEntries(merchandise.map(item => [item.id, 0]));
        parsed.merchandiseDisplay = Object.fromEntries(merchandise.map(item => [item.id, false]));
        parsed.merchandiseSold = 0;
        parsed.merchandiseRevenue = 0;
        parsed.suppliesSpent = 0;
        dirty = true;
      }
      if (parsed.version < 6) {
        // Keep the fraction of an unfinished day and all purchased inventory.
        parsed.secondsLeft = clamp(Number(parsed.secondsLeft) || 0, 0, 90) / 90 * shiftSeconds;
        parsed.version = 6;
        dirty = true;
      }
      if (parsed.version < 7) {
        parsed.version = 7;
        parsed.lowReputationSeconds = 0;
        parsed.reputationPenaltyPaid = 0;
        parsed.stockDeparted = 0;
        parsed.exited = false;
        dirty = true;
      }
      if (parsed.version < 8) {
        // Old brightened cards were previews, not earned collectibles.
        parsed.version = 8;
        parsed.campaign = 1;
        parsed.collectedArtists = [];
        parsed.lastCollectionReward = null;
        parsed.gaiConUnlockedAt = null;
        parsed.unlockedArtists = 0;
        dirty = true;
      }
      if (parsed.version < 9) {
        parsed.version = 9;
        parsed.artistSlots = Object.fromEntries((parsed.collectedArtists || []).map((id, index) => [index + 1, id]));
        parsed.pendingReveals = 0;
        parsed.queue.forEach((customer, index) => {
          if (!customer.guestId && !parsed.collectedArtists.includes(customer.artistId)) {
            customer.guestId = index % guestProfiles.length + 1;
            customer.name = `${guestProfiles[customer.guestId - 1]} của ${artists[customer.artistId - 1]}`;
          }
        });
        dirty = true;
      }
      parsed.collectedArtists = [...new Set((Array.isArray(parsed.collectedArtists) ? parsed.collectedArtists : []).filter(id => Number.isInteger(id) && id >= 1 && id <= artists.length))];
      if (!parsed.artistSlots || typeof parsed.artistSlots !== 'object') parsed.artistSlots = {};
      parsed.pendingReveals = clamp(Number(parsed.pendingReveals) || 0, 0, artists.length - parsed.collectedArtists.length);
      parsed.unlockedArtists = parsed.collectedArtists.length;
      parsed.artistDeck = parsed.artistDeck.filter(id => parsed.collectedArtists.includes(id));
      return parsed;
    }
  } catch { /* start a fresh game */ }
  return freshState();
}

state = load();
profileStates.set(saveFile, state);

export function useSaveFile(file) {
  const selected = path.resolve(file);
  if (selected === saveFile) return;
  save();
  profileStates.set(saveFile, state);
  saveFile = selected;
  dirty = false;
  state = profileStates.get(selected) || load();
  profileStates.set(selected, state);
}

export function saveNow() {
  dirty = true;
  save();
}

function nextArtistId(s) {
  if (!s.artistDeck.length) {
    s.artistDeck = [...s.collectedArtists];
    for (let index = s.artistDeck.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [s.artistDeck[index], s.artistDeck[other]] = [s.artistDeck[other], s.artistDeck[index]];
    }
  }
  return s.artistDeck.pop();
}

function createCustomer(s) {
  const available = zones.filter(z => s.stock[z.id] > 0);
  if (!available.length) return;
  const zone = pick(available);
  const roll = Math.random();
  const kind = roll < 0.13 ? 'bot' : roll < 0.22 ? 'duplicate' : roll < 0.37 ? 'payment' : 'normal';
  const qty = Math.min(s.stock[zone.id], Math.random() < 0.18 ? 2 : 1);
  const guestId = !s.collectedArtists.length || s.customerSeq % 3 !== 0 ? s.customerSeq % guestProfiles.length + 1 : null;
  const artistId = guestId ? Math.floor(Math.random() * artists.length) + 1 : nextArtistId(s);
  const merch = pick(merchandise.filter(item => s.merchandiseDisplay[item.id] && s.merchandiseStock[item.id] > 0));
  const c = {
    id: ++s.customerSeq, artistId, guestId,
    name: guestId ? `${guestProfiles[guestId - 1]} của ${artists[artistId - 1]}` : artists[artistId - 1], zoneId: zone.id,
    merchId: merch && Math.random() < 0.6 ? merch.id : null, merchReceived: false,
    qty, kind, golden: s.customerSeq % 7 === 0 && (kind === 'normal' || kind === 'payment'),
    scanned: s.staff.checker > 0 && Math.random() < (s.staff.checker === 2 ? 1 : 0.7), resolved: false, patience: 100,
    createdAt: Date.now()
  };
  s.queue.push(c);
  if (!s.selectedCustomerId) s.selectedCustomerId = c.id;
  if (c.scanned && s.staff.checker === 2 && (kind === 'bot' || kind === 'duplicate')) {
    s.queue = s.queue.filter(item => item.id !== c.id);
    if (s.selectedCustomerId === c.id) s.selectedCustomerId = s.queue[0]?.id ?? null;
    s.botsStopped++;
    s.reputation = clamp(s.reputation + 3, 0, 100);
    note(s, `Nhân viên kiểm vé đã chặn yêu cầu không hợp lệ trước quầy.`, 'success');
  } else note(s, `${c.name} vừa vào hàng chờ · muốn ${zone.name}${c.scanned ? ' · đã được nhân viên kiểm vé xác minh' : ''}.`);
}

function resolveIncident(s, automatic = false) {
  if (!s.incident) return;
  const label = s.incident.kind === 'fare' ? 'khách lạ định vào concert không có vé' : 'vụ lấy trộm đồ tại concert';
  s.incident = null;
  s.securityCaught++;
  s.reputation = clamp(s.reputation + 2, 0, 100);
  s.cash += 250000;
  note(s, `${automatic ? 'Bảo vệ đã tự xử lý' : 'Đội bảo vệ đã xử lý'} ${label}. Uy tín +2 · thưởng 250.000đ.`, 'success');
}

function createIncident(s, now) {
  s.incident = { id: ++s.incidentSeq, kind: Math.random() < 0.5 ? 'fare' : 'theft', remaining: 20 };
  s.nextIncidentAt = now + 26000;
  if (s.staff.security === 2 || s.staff.security === 1 && Math.random() < 0.65) {
    resolveIncident(s, true);
  } else {
    note(s, s.incident.kind === 'fare' ? 'Có khách lạ định vào concert không có vé! Điều phối bảo vệ.' : 'Có báo cáo mất đồ tại concert! Điều phối bảo vệ.', 'warning');
  }
}

function endShift(s) {
  if (s.phase !== 'playing') return;
  s.phase = s.shift >= totalShifts ? 'complete' : 'summary';
  s.secondsLeft = 0;
  s.paused = false;
  s.exited = false;
  s.pausedAt = null;
  s.queue = [];
  s.selectedCustomerId = null;
  s.selectedZoneId = null;
  s.lastCollectionReward = null;
  if (s.collectedArtists.length + s.pendingReveals < artists.length) s.pendingReveals++;
  s.incident = null;
  const bonus = s.reputation >= 75 ? 1000000 : 0;
  const missionBonus = s.shiftSales >= missionTarget(s.shift) ? 750000 : 0;
  s.missionWon = missionBonus > 0;
  s.cash += bonus + missionBonus;
  note(s, `Kết thúc ngày bán ${s.shift}! ${s.pendingReveals ? `Bạn có ${s.pendingReveals} lượt chọn thẻ bí ẩn trong mục Anh tài. ` : ''}${missionBonus ? 'Hoàn thành nhiệm vụ +750.000đ. ' : ''}${bonus ? 'Thưởng uy tín +1.000.000đ. ' : ''}Vé và vật phẩm đã bán vẫn được trừ khỏi kho.`, 'success');
}

function enforceReputation(s) {
  if (s.reputation >= reputationRules.threshold) s.lowReputationSeconds = 0;
  if (s.reputation > 0 || s.phase === 'gameover') return s.phase === 'gameover';
  s.phase = 'gameover';
  s.paused = false;
  s.exited = false;
  s.pausedAt = null;
  s.queue = [];
  s.selectedCustomerId = null;
  s.selectedZoneId = null;
  s.incident = null;
  note(s, 'Uy tín đã về 0. Quầy phải đóng cửa; hãy chơi lại từ ngày 1.', 'bad');
  dirty = true;
  return true;
}

function chargeReputationPenalty(s, elapsed) {
  if (s.reputation >= reputationRules.threshold) { s.lowReputationSeconds = 0; return; }
  s.lowReputationSeconds += elapsed;
  const periods = Math.floor(s.lowReputationSeconds / reputationRules.intervalSeconds);
  if (!periods) return;
  s.lowReputationSeconds -= periods * reputationRules.intervalSeconds;
  const loss = Math.min(s.cash, periods * reputationRules.penalty);
  s.cash -= loss;
  s.reputationPenaltyPaid += loss;
  if (loss) note(s, `Uy tín dưới 50: trừ ${loss.toLocaleString('vi-VN')}đ phí xử lý khiếu nại.`, 'bad');
}

function dismissSoldOutCustomers(s) {
  if (s.phase !== 'playing') return;
  const leaving = s.queue.filter(c => s.stock[c.zoneId] < c.qty);
  if (!leaving.length) return;
  const ids = new Set(leaving.map(c => c.id));
  s.queue = s.queue.filter(c => !ids.has(c.id));
  s.stockDeparted += leaving.length;
  if (ids.has(s.selectedCustomerId)) {
    s.selectedCustomerId = s.queue[0]?.id ?? null;
    s.selectedZoneId = null;
  }
  note(s, `${leaving.length === 1 ? leaving[0].name : `${leaving.length} khách`} đã về vì khu vé yêu cầu không còn đủ vé. Ghé Kho để nhập thêm.`, 'warning');
}

function addFeedback(s, c, zone, rating, customMessage = null) {
  const happy = [
    `Vé ${zone.name} đã tới tay rồi! Quầy Hỏa Tâm phục vụ rất có tâm.`,
    `Đặt vé cho ê-kíp nhanh gọn, được chọn đúng khu ${zone.name}.`,
    `Chibi ở quầy dễ thương, nhận vé xong muốn quay lại liền!`
  ];
  const slow = [
    `Đã nhận vé ${zone.name}, nhưng mình mong lần sau chờ ít hơn.`,
    `Vé đúng khu rồi. Quầy nên xử lý đơn nhanh hơn một chút nhé.`
  ];
  s.feedback.unshift({
    id: ++s.feedbackSeq, artistId: c.artistId, guestId: c.guestId || null, name: c.name, zoneId: zone.id,
    rating, message: customMessage || (rating >= 4 ? happy[c.id % happy.length] : slow[c.id % slow.length]),
    reply: null, createdAt: new Date().toISOString(), repliedAt: null
  });
  s.feedback = s.feedback.slice(0, 50);
}

function tick() {
  const s = state;
  if (enforceReputation(s)) return;
  if (s.phase !== 'playing' || s.paused) return;
  const now = Date.now();
  const elapsed = Math.max(0, (now - s.lastTick) / 1000);
  const sellingElapsed = Math.min(elapsed, s.secondsLeft);
  s.lastTick = now;
  s.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
  dirty = true;
  chargeReputationPenalty(s, sellingElapsed);
  dismissSoldOutCustomers(s);
  for (const c of [...s.queue]) {
    c.patience -= elapsed * (s.upgrades.queue ? 0.75 : 1.25);
    if (c.patience <= 0) {
      s.queue = s.queue.filter(x => x.id !== c.id);
      s.reputation = clamp(s.reputation - 4, 0, 100);
      s.missed++;
      s.combo = 0;
      addFeedback(s, c, zones.find(z => z.id === c.zoneId), 1, `Mình chờ ở quầy hơi lâu nên đành rời đi. Hy vọng lần sau được phục vụ nhanh hơn.`);
      note(s, `${c.name} đã rời hàng chờ. Uy tín -4.`, 'bad');
      if (enforceReputation(s)) return;
    }
  }
  if (s.incident) {
    s.incident.remaining -= elapsed;
    if (s.incident.remaining <= 0) {
      s.incident = null;
      s.securityMissed++;
      const loss = Math.min(s.cash, 500000);
      s.cash -= loss;
      s.reputation = clamp(s.reputation - 4, 0, 100);
      note(s, `Bảo vệ tới chậm. Thất thoát ${loss.toLocaleString('vi-VN')}đ · uy tín -4.`, 'bad');
      if (enforceReputation(s)) return;
    }
  }
  if (!s.queue.some(c => c.id === s.selectedCustomerId)) s.selectedCustomerId = s.queue[0]?.id ?? null;
  const cap = 4 + s.upgrades.queue * 2;
  if (s.secondsLeft > 0 && now >= s.nextSpawnAt && s.queue.length < cap) {
    createCustomer(s);
    s.nextSpawnAt = now + clamp((8200 - s.shift * 650) * (1 - s.staff.marketing * 0.15) * (1 - attraction(s) / 100), 3000, 9000);
  }
  if (s.secondsLeft > 10 && now >= s.nextIncidentAt && !s.incident) createIncident(s, now);
  if (s.secondsLeft <= 0) endShift(s);
  dirty = true;
}

function fail(s, message, reputation = 3) {
  s.errors++;
  s.combo = 0;
  s.reputation = clamp(s.reputation - reputation, 0, 100);
  note(s, `${message} Uy tín -${reputation}.`, 'bad');
}

function removeCustomer(s, c) {
  s.queue = s.queue.filter(x => x.id !== c.id);
  s.selectedCustomerId = s.queue[0]?.id ?? null;
  s.selectedZoneId = null;
}

export function getPublicState() {
  tick();
  save();
  return { ...state, gaiConBadge: state.collectedArtists.length === artists.length, zones, artists, merchandise, attraction: attraction(state), shiftSeconds, totalShifts, gameTimeRate,
    gameSecondsElapsed: (shiftSeconds - state.secondsLeft) * gameTimeRate,
    gameSecondsLeft: state.secondsLeft * gameTimeRate,
    taxRate, reputationRules, staffCosts, missionTarget: missionTarget(state.shift) };
}

function attraction(s) {
  return merchandise.reduce((total, item) => total + (s.merchandiseDisplay[item.id] && s.merchandiseStock[item.id] > 0 ? item.attraction : 0), 0);
}

function pauseGame(s) {
  if (!s.paused) { s.paused = true; s.pausedAt = Date.now(); }
  s.exited = false;
  note(s, 'Đã tạm dừng. Đồng hồ, khách, sự cố và tiền phạt được giữ nguyên.');
}

export function act(type, payload = {}) {
  tick();
  const s = state;
  if (s.phase === 'gameover' && type !== 'reset' && type !== 'saveNow') return getPublicState();
  if (s.paused && ['start', 'scan', 'retryPayment', 'reject', 'sell', 'sellZone', 'sellMerch', 'selectCustomer', 'selectZone', 'dispatchSecurity'].includes(type)) {
    note(s, 'Game đang tạm dừng. Chọn Tiếp tục chơi để phục vụ khách.', 'warning');
    dirty = true;
    save();
    return getPublicState();
  }
  if (type === 'reset') {
    state = freshState();
    dirty = true;
    save();
    return getPublicState();
  }
  if (type === 'endDay' || type === 'exit') {
    endShift(s);
  } else if (type === 'unlockArtist') {
    const slot = Number(payload.slot);
    const remaining = artists.map((_, i) => i + 1).filter(id => !s.collectedArtists.includes(id));
    if (!Number.isInteger(slot) || slot < 1 || slot > artists.length || s.artistSlots[slot] || !s.pendingReveals || !remaining.length) {
      note(s, 'Chọn một thẻ bí ẩn khi bạn có lượt mở khóa.', 'warning');
    } else {
      const artistId = pick(remaining);
      s.artistSlots[slot] = artistId;
      s.collectedArtists.push(artistId);
      s.pendingReveals--;
      s.unlockedArtists = s.collectedArtists.length;
      s.artistDeck = [];
      const badgeUnlocked = s.collectedArtists.length === artists.length;
      if (badgeUnlocked && !s.gaiConUnlockedAt) s.gaiConUnlockedAt = new Date().toISOString();
      s.lastCollectionReward = { artistId, slot, name: artists[artistId - 1], campaign: s.campaign, shift: s.shift, badgeUnlocked };
      note(s, `Thẻ bí ẩn #${slot} hé lộ ${artists[artistId - 1]}! Bạn đã sở hữu avatar và chibi.${badgeUnlocked ? ' Huy hiệu Gai Con đã mở khóa!' : ''}`, 'success');
    }
  } else if (type === 'saveNow') {
    note(s, 'Tiến trình đã được lưu trên máy chủ.', 'success');
  } else if (type === 'exitGame') {
    pauseGame(s);
    s.exited = true;
    note(s, 'Đã lưu và rời ca chơi. Bạn có thể đóng tab, sau đó quay lại tiếp tục.', 'success');
  } else if (type === 'nextCampaign' && s.phase === 'complete') {
    s.campaign++;
    s.shift = 1;
    s.phase = 'intro';
    s.secondsLeft = shiftSeconds;
    s.shiftSales = 0;
    s.missionWon = false;
    s.lastSale = null;
    s.lastCollectionReward = null;
    s.paused = false;
    s.exited = false;
    s.pausedAt = null;
    note(s, `Chuẩn bị đợt ${s.campaign}. Tiếp tục sưu tầm: ${s.collectedArtists.length}/34 anh tài; ngân sách, nhân viên và hàng tồn được giữ nguyên.`, 'success');
  } else if (type === 'pause') {
    pauseGame(s);
  } else if (type === 'resume') {
    if (s.paused) {
      const now = Date.now();
      const duration = Math.max(0, now - (s.pausedAt || now));
      if (s.nextSpawnAt) s.nextSpawnAt += duration;
      if (s.nextIncidentAt) s.nextIncidentAt += duration;
      s.lastTick = now;
      s.paused = false;
      s.exited = false;
      s.pausedAt = null;
      note(s, 'Đã tiếp tục chơi. Chào mừng bạn trở lại!', 'success');
    }
  } else if (type === 'restockTickets') {
    const zone = zones.find(z => z.id === payload.id);
    const qty = Number(payload.qty);
    if (!zone || ![5, 10].includes(qty)) note(s, 'Chọn khu vé và kiện 5 hoặc 10 vé.', 'warning');
    else if (s.stock[zone.id] + qty > zone.stock * 4) note(s, 'Kho khu này đã gần đầy. Chọn kiện nhỏ hơn.', 'warning');
    else {
      const cost = Math.round(zone.price * 0.15) * qty;
      if (s.cash < cost) note(s, 'Chưa đủ ngân sách nhập vé.', 'warning');
      else { s.cash -= cost; s.suppliesSpent += cost; s.stock[zone.id] += qty; note(s, `Đã nhập ${qty} vé ${zone.name} vào kho · -${cost.toLocaleString('vi-VN')}đ.`, 'success'); }
    }
  } else if (type === 'restockMerch') {
    const item = merchandise.find(m => m.id === payload.id);
    if (item) {
      if (s.merchandiseStock[item.id] + item.pack > 50) note(s, 'Kho vật phẩm này đã đầy (50 món).', 'warning');
      else if (s.cash < item.cost) note(s, 'Chưa đủ ngân sách nhập merchandise.', 'warning');
      else { s.cash -= item.cost; s.suppliesSpent += item.cost; s.merchandiseStock[item.id] += item.pack; note(s, `Đã nhập ${item.pack} ${item.name} vào kho.`, 'success'); }
    }
  } else if (type === 'displayMerch') {
    const item = merchandise.find(m => m.id === payload.id);
    if (item) {
      if (!s.merchandiseDisplay[item.id] && !s.merchandiseStock[item.id]) note(s, 'Nhập hàng trước khi trưng bày nhé.', 'warning');
      else { s.merchandiseDisplay[item.id] = !s.merchandiseDisplay[item.id]; note(s, `${s.merchandiseDisplay[item.id] ? 'Đã trưng bày' : 'Đã cất'} ${item.name}.`, 'success'); }
    }
  } else if (type === 'sellMerch' && s.phase === 'playing') {
    const c = activeCustomer(s);
    const item = merchandise.find(m => m.id === c?.merchId);
    if (!c || !item || c.merchReceived) note(s, 'Khách hiện không cần mua thêm vật phẩm.', 'warning');
    else if (!c.scanned || ['bot', 'duplicate'].includes(c.kind) || c.kind === 'payment' && !c.resolved) note(s, 'Xác minh và hoàn tất thanh toán trước khi bán vật phẩm.', 'warning');
    else if (!s.merchandiseStock[item.id]) note(s, 'Vật phẩm đã hết. Ghé Kho để nhập thêm.', 'warning');
    else {
      s.merchandiseStock[item.id]--;
      c.merchReceived = true;
      c.patience = Math.min(100, c.patience + 10);
      s.cash += item.price;
      s.revenue += item.price;
      s.merchandiseRevenue += item.price;
      s.merchandiseSold++;
      note(s, `${c.name} đã nhận ${item.name} · +${item.price.toLocaleString('vi-VN')}đ.`, 'success');
    }
  } else if (type === 'start') {
    if (s.phase === 'intro') {
      s.phase = 'playing';
      s.lastTick = Date.now();
      s.nextSpawnAt = 0;
      s.nextIncidentAt = Date.now() + 18000;
      note(s, 'Mở bán! Khách đầu tiên đang tới.', 'success');
    } else if (s.phase === 'summary') {
      if (s.taxDue > 0) {
        s.reputation = clamp(s.reputation - 2, 0, 100);
        note(s, 'Chưa nộp quỹ thuế mô phỏng trước ca mới. Uy tín -2.', 'warning');
      }
      s.shift++;
      s.shiftSales = 0;
      s.missionWon = false;
      s.lastSale = null;
      s.lastCollectionReward = null;
      s.phase = 'playing';
      s.secondsLeft = shiftSeconds;
      s.lastTick = Date.now();
      s.nextSpawnAt = 0;
      s.nextIncidentAt = Date.now() + 18000;
      note(s, `Ca bán ${s.shift} đã bắt đầu.`, 'success');
    }
  } else if (type === 'selectCustomer' && s.phase === 'playing') {
    if (s.queue.some(c => c.id === payload.id)) {
      s.selectedCustomerId = payload.id;
      s.selectedZoneId = null;
    }
  } else if (type === 'selectZone' && s.phase === 'playing') {
    if (!payload.id || zones.some(z => z.id === payload.id)) s.selectedZoneId = payload.id || null;
  } else if (type === 'scan' && s.phase === 'playing') {
    const c = activeCustomer(s);
    if (c && !c.scanned) {
      c.scanned = true;
      c.patience = Math.max(1, c.patience - (s.upgrades.scanner ? 1 : 3));
      const result = c.kind === 'bot' ? 'Phiên đặt vé bị bot chen vào!' : c.kind === 'duplicate' ? 'Mã đặt chỗ bị trùng với phiên khác!' : c.kind === 'payment' ? 'Thanh toán chưa hoàn tất.' : 'Mã hợp lệ, có thể phát hành vé.';
      note(s, `${c.name}: ${result}`, c.kind === 'normal' ? 'success' : 'warning');
    }
  } else if (type === 'retryPayment' && s.phase === 'playing') {
    const c = activeCustomer(s);
    if (c?.kind === 'payment' && c.scanned && !c.resolved) {
      c.resolved = true;
      c.patience = Math.max(1, c.patience - (s.upgrades.payment ? 1 : 4));
      note(s, `Thanh toán của ${c.name} đã được xử lý lại.`, 'success');
    } else note(s, 'Chỉ xử lý lại khi đã xác minh được lỗi thanh toán.', 'warning');
  } else if (type === 'reject' && s.phase === 'playing') {
    const c = activeCustomer(s);
    if (c) {
      if (c.kind === 'bot' || c.kind === 'duplicate') {
        s.botsStopped++;
        s.reputation = clamp(s.reputation + 3, 0, 100);
        note(s, `Đã chặn yêu cầu không hợp lệ gắn với đơn của ${c.name}. Uy tín +3.`, 'success');
      } else fail(s, `Từ chối nhầm ${c.name}.`, 5);
      removeCustomer(s, c);
    }
  } else if ((type === 'sell' || type === 'sellZone') && s.phase === 'playing') {
    if (type === 'sellZone') s.selectedZoneId = zones.some(z => z.id === payload.id) ? payload.id : null;
    const c = activeCustomer(s);
    if (!c) note(s, 'Chọn một khách trong hàng chờ.', 'warning');
    else if (!s.selectedZoneId) note(s, 'Chọn đúng khu vé khách yêu cầu.', 'warning');
    else if (c.zoneId !== s.selectedZoneId) fail(s, 'Xuất sai khu vé.', 5);
    else if (s.stock[c.zoneId] < c.qty) dismissSoldOutCustomers(s);
    else if (c.kind === 'bot' || c.kind === 'duplicate') {
      fail(s, `Yêu cầu ${c.kind === 'bot' ? 'bị bot chen vào' : 'trùng mã'} đã lọt qua.`, 8);
      removeCustomer(s, c);
    } else if (c.kind === 'payment' && !c.resolved) fail(s, 'Chưa nhận được thanh toán.', 4);
    else {
      const zone = zones.find(z => z.id === c.zoneId);
      const amount = zone.price * c.qty;
      const tax = Math.round(amount * taxRate);
      s.stock[zone.id] -= c.qty;
      s.cash += amount + tax;
      s.revenue += amount;
      s.taxCollected += tax;
      s.taxDue += tax;
      s.sold += c.qty;
      s.served++;
      s.shiftSales++;
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.reputation = clamp(s.reputation + (c.scanned ? 3 : 1), 0, 100);
      const tip = (c.golden && c.patience >= 55 ? 500000 : c.scanned && c.patience >= 75 ? 200000 : 0) + s.staff.marketing * 100000;
      s.cash += tip;
      s.tips += tip;
      if (c.golden) s.goldenServed++;
      addFeedback(s, c, zone, c.patience >= 55 ? 5 : 3);
      note(s, `Chốt ${c.qty} vé ${zone.name} cho ${c.name} · +${amount.toLocaleString('vi-VN')}đ · thuế game ${tax.toLocaleString('vi-VN')}đ${tip ? ` · tip ${tip.toLocaleString('vi-VN')}đ` : ''}`, 'success');
      s.lastSale = { eventId: s.eventId, artistId: c.artistId, guestId: c.guestId || null, name: c.name, zoneId: zone.id, zoneName: zone.name, qty: c.qty, amount, tax, tip };
      removeCustomer(s, c);
    }
  } else if (type === 'hireStaff') {
    const key = payload.id;
    const titles = { checker: 'kiểm vé', marketing: 'marketing', security: 'bảo vệ' };
    if (staffCosts[key] && s.staff[key] < 2) {
      const cost = staffCosts[key][s.staff[key]];
      if (s.cash < cost) note(s, 'Chưa đủ ngân sách thuê nhân viên.', 'warning');
      else {
        s.cash -= cost;
        s.staff[key]++;
        note(s, `Đã thuê nhân viên ${titles[key]} cấp ${s.staff[key]}.`, 'success');
      }
    }
  } else if (type === 'dispatchSecurity' && s.phase === 'playing') {
    if (!s.incident) note(s, 'Hiện không có sự cố cần bảo vệ.', 'warning');
    else if (!s.staff.security && s.cash < 250000) note(s, 'Cần 250.000đ để gọi đội bảo vệ tạm thời.', 'warning');
    else {
      if (!s.staff.security) s.cash -= 250000;
      resolveIncident(s);
    }
  } else if (type === 'remitTax' && s.phase !== 'playing') {
    if (!s.taxDue) note(s, 'Quỹ thuế mô phỏng hiện đã đối soát.', 'info');
    else if (s.cash < s.taxDue) note(s, 'Ngân sách không đủ để nộp quỹ thuế mô phỏng.', 'warning');
    else {
      const amount = s.taxDue;
      s.cash -= amount;
      s.taxRemitted += amount;
      s.taxDue = 0;
      s.reputation = clamp(s.reputation + 1, 0, 100);
      note(s, `Đã nộp ${amount.toLocaleString('vi-VN')}đ thuế mô phỏng. Uy tín +1.`, 'success');
    }
  } else if (type === 'replyFeedback') {
    const item = s.feedback.find(entry => entry.id === Number(payload.id));
    const reply = typeof payload.message === 'string' ? payload.message.trim().replace(/\s+/g, ' ').slice(0, 220) : '';
    if (!item) note(s, 'Không tìm thấy nhận xét này.', 'warning');
    else if (!reply) note(s, 'Nhập lời nhắn trước khi gửi.', 'warning');
    else {
      if (!item.reply) s.reputation = clamp(s.reputation + (item.rating <= 3 ? 2 : 1), 0, 100);
      item.reply = reply;
      item.repliedAt = new Date().toISOString();
      note(s, `Quầy đã trả lời ${item.name}.`, 'success');
    }
  } else if (type === 'upgrade' && (s.phase === 'intro' || s.phase === 'summary')) {
    const key = payload.id;
    const costs = { scanner: [2000000, 4000000], queue: [2500000, 5000000], payment: [1500000, 3000000] };
    if (costs[key] && s.upgrades[key] < 2) {
      const cost = costs[key][s.upgrades[key]];
      if (s.cash < cost) note(s, 'Chưa đủ ngân sách nâng cấp.', 'warning');
      else {
        s.cash -= cost;
        s.upgrades[key]++;
        note(s, `Đã nâng cấp ${key === 'scanner' ? 'máy xác minh' : key === 'queue' ? 'điều phối hàng chờ' : 'cổng thanh toán'}.`, 'success');
      }
    }
  }
  if (!enforceReputation(s)) dismissSoldOutCustomers(s);
  dirty = true;
  save();
  return getPublicState();
}
