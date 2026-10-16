const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const modal = document.querySelector('#modal');
const modalContent = document.querySelector('#modalContent');
let game = null;
let lastSnapshotAt = Date.now();
let session = { loggedIn: false, username: null };
let view = 'play';
let busy = false;
let pendingActions = [];
let seenEvent = 0;
let soundOn = window.localStorage?.getItem('hoa-tam-sound') !== 'off';
let audioContext;
let portraits = {};
let portraitFrames = {};
let artistArt = 'chibi';
let renderStamp = '';
let musicOpen = false;
let mapSelectedZoneId = null;
const mapHotspots = [
  ['hac-ma',46,25.7,8,4.2],['bach-ma',46,30.5,8,4.2],
  ['cui-lua',16.5,28,4.5,12],['dien-anh',21,28,4.5,12],['dien-anh',74.5,28,4.5,12],['cui-lua',79,28,4.5,12],
  ['ky-si',27.4,25.7,5,18],['chien-tuong',32.4,25.7,4.5,18],['hoa-lenh',36.9,25.7,5.4,18],['hoa-tam',42.3,25.7,7,18],
  ['hoa-tam',50.7,25.7,7,18],['hoa-lenh',57.7,25.7,5.4,18],['chien-tuong',63.1,25.7,4.5,18],['ky-si',67.6,25.7,5,18],
  ['hoa-lua',18,42,7,10],['my-nam',22,46,8,9],['hoa-lua',75,42,7,10],['my-nam',70,46,8,9],
  ['ngoai-o',33,45,14,5.6],['ngoai-o',53,45,14,5.6],
  ['svip',37,50.8,10,2.1],['svip',53,50.8,10,2.1],
  ['vinh-quy',37,53,13,3.8],['vinh-quy',50,53,13,3.8],
  ['soan-nhac',33,57,17,4],['soan-nhac',50,57,17,4],
  ['lam-manh',33,61,17,4],['lam-manh',50,61,17,4],
  ['hoa-loc',39,65,11,3.7],['hoa-loc',50,65,11,3.7]
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
const fullMoney = value => `${value.toLocaleString('vi-VN')}đ`;
const zoneById = id => game.zones.find(zone => zone.id === id);
const chibiOf = id => `assets/chibi/${String(id).padStart(2, '0')}.svg`;
const chibiFullOf = id => `assets/chibi-full/${String(id).padStart(2, '0')}.svg`;
const customerArt = (customer, full = false) => customer.guestId ? `assets/guests/${String(customer.guestId).padStart(2, '0')}${full ? '-full' : ''}.svg` : full ? chibiFullOf(customer.artistId) : chibiOf(customer.artistId);
function portraitOf(id, name) {
  const key = String(id).padStart(2, '0');
  const frame = portraitFrames[key];
  if (!portraits[key]) return '';
  return frame ? `<svg class="portrait-photo" viewBox="${frame.x} ${frame.y} ${frame.size} ${frame.size}" role="img" aria-label="Chân dung ${escapeHtml(name)}"><image href="${escapeHtml(portraits[key])}" width="${frame.width}" height="${frame.height}" /></svg>` : `<img src="${escapeHtml(portraits[key])}" alt="Chân dung ${escapeHtml(name)}">`;
}
const icon = (name, cls = '') => `<span class="symbol ${cls}" aria-hidden="true">${name}</span>`;
const uiIcon = name => `<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const countdown = seconds => { const time = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; };
const gameClock = (elapsed = game.gameSecondsElapsed || 0) => { const seconds = Math.max(0, Math.floor(elapsed)); return `18:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };

function synthBeep(tone) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const play = () => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const notes = { click: [420, 570, .08], handoff: [740, 1180, .32], bad: [180, 110, .2], success: [540, 900, .16] };
      const [from, to, duration] = notes[tone] || notes.success;
      oscillator.type = tone === 'bad' ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + duration);
      gain.gain.setValueAtTime(tone === 'click' ? .045 : .075, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration + .03);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration + .04);
    };
    if (audioContext.state === 'running') play();
    else audioContext.resume().then(() => { if (soundOn) play(); }).catch(() => {});
  } catch { /* audio is optional */ }
}

function beep(tone = 'success') {
  if (!soundOn) return;
  // HTML audio plays reliably from a direct tap on Safari. The oscillator is a fallback.
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    if (tone === 'click' && (window.AudioContext || window.webkitAudioContext)) {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    }
    const player = document.querySelector(`#sfx${tone[0].toUpperCase()}${tone.slice(1)}`);
    if (player?.play) {
      player.pause();
      player.currentTime = 0;
      player.volume = tone === 'click' ? .85 : 1;
      const started = player.play();
      if (started?.catch) started.catch(() => synthBeep(tone));
      return;
    }
  } catch { /* fall back to generated oscillator */ }
  synthBeep(tone);
}

function burst() {
  const layer = document.querySelector('#fx');
  for (let i = 0; i < 20; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 320)}px`);
    piece.style.setProperty('--y', `${Math.round(-80 - Math.random() * 260)}px`);
    piece.style.setProperty('--r', `${Math.round(Math.random() * 900)}deg`);
    piece.style.background = ['#ffd261', '#ff6a38', '#fff1b9', '#c84539'][i % 4];
    layer.append(piece);
    setTimeout(() => piece.remove(), 1100);
  }
}

function showToast(event) {
  if (!event || event.id === seenEvent) return;
  seenEvent = event.id;
  toast.textContent = event.message;
  toast.className = `visible ${event.tone}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.className = '', 3300);
  if (event.tone === 'success') {
    beep('success');
    if (event.message.startsWith('Chốt')) burst();
  } else if (event.tone === 'bad') beep('bad');
}

function stateStamp() {
  return [view, game.phase, game.paused, game.exited, game.shift, game.eventId, game.selectedCustomerId,
    game.selectedZoneId, game.queue.map(c => `${c.id}:${c.scanned}:${c.resolved}`).join(','),
    game.feedbackSeq, game.feedback?.filter(item => item.reply).length, game.cash,
    game.incident?.id, game.staff?.checker, game.staff?.marketing, game.staff?.security, game.taxDue].join('|');
}

function updateLiveValues() {
  if (!game) return;
  const running = game.phase === 'playing' && !game.paused && !game.exited;
  const elapsed = running ? Math.max(0, (Date.now() - lastSnapshotAt) / 1000) : 0;
  const secondsLeft = Math.max(0, game.secondsLeft - elapsed);
  const realTimer = document.querySelector('[data-real-countdown]');
  if (realTimer) realTimer.textContent = countdown(secondsLeft);
  const clock = document.querySelector('[data-game-clock]');
  if (clock) clock.textContent = gameClock((game.gameSecondsElapsed || 0) + Math.min(elapsed, game.secondsLeft) * game.gameTimeRate);
  const timer = document.querySelector('.timer strong');
  if (timer) {
    const time = Math.ceil(secondsLeft);
    timer.textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
    timer.closest('.timer')?.classList.toggle('urgent', game.phase === 'playing' && time < 20);
  }
  const track = document.querySelector('.time-track div');
  if (track) track.style.width = `${Math.max(0, secondsLeft / game.shiftSeconds * 100)}%`;
  for (const c of game.queue) {
    document.querySelectorAll(`[data-customer-patience="${c.id}"]`).forEach(bar => { bar.style.width = `${Math.max(0, c.patience)}%`; });
  }
  const incidentTimer = document.querySelector('[data-incident-timer]');
  if (incidentTimer && game.incident) incidentTimer.textContent = `${Math.ceil(Math.max(0, game.incident.remaining - elapsed))}s`;
}

function animateTicket(sale, start, target) {
  if (!start || !target) return;
  const flight = document.createElement('div');
  flight.className = 'ticket-flight';
  const width = Math.min(270, window.innerWidth - 34);
  const height = 148;
  const originLeft = Math.max(8, Math.min(window.innerWidth - width - 8, start.left + start.width / 2 - width / 2));
  const originTop = Math.max(48, start.top + start.height / 2 - height / 2);
  flight.style.left = `${originLeft}px`;
  flight.style.top = `${originTop}px`;
  flight.innerHTML = `<span>HỎA TÂM · CONCERT 2026</span><strong>${escapeHtml(sale.zoneName)}</strong><small>${fullMoney(sale.amount / sale.qty)} / vé</small><small>${sale.qty} vé · ${fullMoney(sale.amount)} tổng cộng</small><em>ĐÃ XÁC NHẬN ✓</em><i></i>`;
  document.body.append(flight);
  const middleX = (window.innerWidth - width) / 2 - originLeft;
  const middleY = (window.innerHeight - height) / 2 - originTop;
  const dx = target.left + target.width / 2 - originLeft - width / 2;
  const dy = target.top + target.height / 2 - originTop - height / 2;
  const motion = flight.animate([
    { transform: 'translate(0,0) rotate(-5deg) scale(.6)', opacity: 0 },
    { transform: `translate(${middleX}px,${middleY}px) rotate(0) scale(1)`, opacity: 1, offset: .24 },
    { transform: `translate(${middleX}px,${middleY}px) rotate(0) scale(1)`, opacity: 1, offset: .66 },
    { transform: `translate(${dx}px,${dy}px) rotate(8deg) scale(.55)`, opacity: 0, offset: 1 }
  ], { duration: 3800, easing: 'ease-in-out' });
  motion.finished.finally(() => flight.remove());
  setTimeout(() => {
    beep('handoff');
    const reaction = document.createElement('div');
    reaction.className = 'handoff-reaction';
    reaction.style.left = `${Math.max(12, Math.min(window.innerWidth - 190, target.left))}px`;
    reaction.style.top = `${Math.max(60, target.top - 30)}px`;
    reaction.innerHTML = `<img src="${customerArt(sale, true)}" alt=""><span>Nhận vé rồi!<br><b>Cảm ơn quầy nhé ♥</b></span>`;
    document.body.append(reaction);
    setTimeout(() => reaction.remove(), 1800);
  }, 3600);
}

async function refresh() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('offline');
    game = await response.json();
    lastSnapshotAt = Date.now();
    if (game.paused || game.exited || game.phase === 'gameover') stopBackgroundMusic();
    if (!document.activeElement?.matches('.reply-input')) {
      if (stateStamp() !== renderStamp) render();
      else updateLiveValues();
    }
    showToast(game.lastEvent);
  } catch {
    if (!game) app.innerHTML = `<section class="offline card"><h2>Không kết nối được máy chủ</h2><p>Khởi chạy game bằng <code>npm start</code>, sau đó tải lại trang.</p><button class="primary-btn" onclick="location.reload()">Thử lại</button></section>`;
  }
}

async function act(type, payload = {}) {
  if (busy) { pendingActions.push({ type, payload }); return; }
  busy = true;
  const previousSaleId = game?.lastSale?.eventId;
  const ticketStart = type === 'sellZone' ? document.querySelector(`.ticket-tile[data-id="${payload.id}"]`)?.getBoundingClientRect() : null;
  const ticketTarget = type === 'sellZone' ? document.querySelector('.scene-customer')?.getBoundingClientRect() : null;
  try {
    const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, payload }) });
    if (!response.ok) throw new Error('action failed');
    game = await response.json();
    lastSnapshotAt = Date.now();
    if (['reset', 'endDay', 'exit', 'nextCampaign'].includes(type)) view = 'play';
    render();
    if (type === 'resume' || type === 'start') playBackgroundMusic();
    if (type === 'endDay' || type === 'exit') stopBackgroundMusic();
    if (type === 'sellZone' && game.lastSale && game.lastSale.eventId !== previousSaleId) animateTicket(game.lastSale, ticketStart, ticketTarget);
    showToast(game.lastEvent);
  } catch { toast.textContent = 'Mất kết nối. Thử lại sau một chút.'; toast.className = 'visible bad'; }
  finally { busy = false; const next = pendingActions.shift(); if (next) act(next.type, next.payload); }
}

function renderHud() {
  const time = Math.ceil(game.secondsLeft);
  const live = game.phase === 'playing';
  return `<section class="hud">
    <div class="hud-title"><span class="eyebrow">${live ? '● ĐANG MỞ BÁN' : 'QUẢN LÝ CONCERT'}</span><h1>Ngày bán ${game.shift}<small> / ${game.totalShifts}</small></h1></div>
    <div class="hud-stats">
      <div class="stat timer ${live && time < 20 ? 'urgent' : ''}"><small>THỜI GIAN</small><strong>${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}</strong></div>
      <div class="stat"><small>DOANH THU</small><strong>${money(game.revenue)}</strong></div>
      <div class="stat"><small>UY TÍN</small><strong>${game.reputation}<span>/100</span></strong></div>
      <div class="stat"><small>COMBO</small><strong>×${game.combo}</strong></div>
    </div>
    ${live ? `<div class="time-track"><div style="width:${Math.max(0, game.secondsLeft / game.shiftSeconds * 100)}%"></div></div>` : ''}
    <div class="mission-ribbon"><span>✦ NHIỆM VỤ CA ${game.shift}</span><strong>Phục vụ ${game.shiftSales}/${game.missionTarget} khách</strong><small>Đạt mục tiêu: thưởng 750.000đ</small><div class="mission-track"><i style="width:${Math.min(100, game.shiftSales / game.missionTarget * 100)}%"></i></div></div>
  </section>`;
}

function renderQueue() {
  return `<section class="queue-section"><div class="section-heading"><h2>Hàng chờ <em>${game.queue.length}</em></h2><span>${game.missed ? `${game.missed} khách đã bỏ đi` : 'Chạm chọn khách để phục vụ'}</span></div>
  <div class="queue-rail">${game.queue.length ? game.queue.map(c => {
    const zone = zoneById(c.zoneId);
    return `<button class="queue-person ${game.selectedCustomerId === c.id ? 'selected' : ''}" data-action="selectCustomer" data-id="${c.id}" aria-label="Chọn khách ${escapeHtml(c.name)}">
      <span class="person-avatar"><img src="${customerArt(c)}" alt="" draggable="false"></span><span class="person-info"><strong>${escapeHtml(c.name)}</strong><small>${c.golden ? '✦ VÉ VÀNG · ' : ''}${escapeHtml(zone.name)} · ${c.qty} vé</small></span><span class="patience"><i data-customer-patience="${c.id}" style="width:${Math.max(0, c.patience)}%"></i></span>
    </button>`;
  }).join('') : `<div class="empty-queue">Khách đang tiến vào hàng chờ…</div>`}</div></section>`;
}

function scanMessage(c) {
  if (!c.scanned) return 'Chưa xác minh. Kiểm tra trước khi phát hành để tránh bot, trùng mã và lỗi thanh toán.';
  return c.kind === 'bot' ? '⚠ Bot chen vào phiên đặt vé. Hãy chặn yêu cầu này.' : c.kind === 'duplicate' ? '⚠ Mã bị trùng với phiên khác. Hãy chặn yêu cầu này.' : c.kind === 'payment' && !c.resolved ? '⚠ Chưa thanh toán. Yêu cầu thanh toán lại.' : '✓ Hợp lệ. Có thể phát hành vé.';
}

function renderTicketTile(z, c) {
  return `<button class="ticket-tile ${c.zoneId === z.id ? 'requested' : ''}" data-action="sellZone" data-id="${z.id}" style="--ticket-color:${z.color}" ${game.stock[z.id] < c.qty ? 'disabled' : ''} aria-label="In ${c.qty} vé ${escapeHtml(z.name)} cho ${escapeHtml(c.name)}"><span class="ticket-stub" aria-hidden="true"><span>✦</span><b>VÉ</b><small>2026</small></span><span class="ticket-face"><small>HỎA TÂM · LIVE</small><strong>${escapeHtml(z.name)}</strong><span>${money(z.price)} / vé</span><em>Còn ${game.stock[z.id]} vé</em></span></button>`;
}

function renderDesk() {
  const c = game.queue.find(item => item.id === game.selectedCustomerId);
  if (!c) return `<section class="desk card desk-empty"><div class="desk-glow"></div><span class="ticket-outline">✦</span><h2>Quầy sẵn sàng</h2><p>Khách chibi đang tiến vào quầy…</p></section>`;
  const zone = zoneById(c.zoneId);
  return `<section class="desk card"><div class="desk-glow"></div>
    <div class="desk-top"><span class="pill live-pill">✦ QUẦY VÉ HỎA TÂM</span><span class="fan-interest">${c.golden ? '★ ĐƠN VÉ VÀNG · TIP 500K' : `${c.guestId ? 'KHÁCH CONCERT' : 'ANH TÀI #' + String(c.artistId).padStart(2, '0')} · LƯỢT ${String(c.id).padStart(3, '0')}`}</span></div>
    <div class="booth-scene" aria-label="${escapeHtml(c.name)} đang chờ nhận vé ở quầy">
      <div class="booth-awning"><span>HỎA TÂM</span><b>✦</b><span>BOX OFFICE</span></div>
      <div class="booth-stage">
        <div class="scene-customer ${c.golden ? 'golden-customer' : ''}"><img src="${customerArt(c, true)}" alt="Chibi ${escapeHtml(c.name)}" draggable="false"><span class="scene-shadow"></span></div>
        <div class="order-bubble"><small>ĐƠN CỦA ${escapeHtml(c.name)}</small><strong>“Cho mình ${c.qty} vé ${escapeHtml(zone.name)} nhé!”</strong><span>♥ KIÊN NHẪN <i><b data-customer-patience="${c.id}" style="width:${Math.max(0, c.patience)}%"></b></i></span></div>
        <div class="ticket-machine"><span class="machine-title">MÁY IN VÉ</span><div class="machine-slot"></div><div class="ticket-preview" style="--ticket-zone:${zone.color}"><small>HỎA TÂM · LIVE</small><strong>${escapeHtml(zone.name)}</strong><span>${c.qty} VÉ · 2026</span><i></i></div></div>
      </div>
      <div class="booth-counter"><span>✦ XÁC MINH</span><span>▥ CHỌN KHU</span><span>➜ GIAO VÉ</span></div>
    </div>
    <div class="desk-customer-meta"><div class="customer-identity">${!c.guestId ? portraitOf(c.artistId, c.name) : ''}<div><small>${c.guestId ? 'GIA ĐÌNH & BẠN BÈ · KHÁCH MÔ PHỎNG' : 'ANH TÀI ĐẶT VÉ CHO Ê-KÍP'}</small><h2>${escapeHtml(c.name)}</h2></div></div><span>${c.golden ? '★ VÉ VÀNG' : 'ĐANG CHỜ VÉ'}</span></div>
    <div class="request-strip"><div><small>KHU KHÁCH MUỐN</small><strong><i style="background:${zone.color}"></i>${escapeHtml(zone.name)}</strong></div><div><small>TỔNG GỒM THUẾ 5%</small><strong>${fullMoney(Math.round(zone.price * c.qty * (1 + game.taxRate)))}</strong></div><div><small>CÒN LẠI</small><strong>${game.stock[zone.id]} vé</strong></div></div>
    <div class="scan-result ${c.scanned ? (c.kind === 'normal' || c.resolved ? 'valid' : 'alert') : ''}">${scanMessage(c)}</div>
    <div class="desk-buttons"><button data-action="scan" ${c.scanned ? 'disabled' : ''} class="secondary-btn">${uiIcon('scanner')} Xác minh</button><button data-action="retryPayment" ${c.kind !== 'payment' || !c.scanned || c.resolved ? 'disabled' : ''} class="secondary-btn">${uiIcon('payment')} Thanh toán lại</button><button data-action="reject" class="danger-btn">Chặn yêu cầu</button></div>
    ${c.merchId ? (() => { const item = game.merchandise.find(m => m.id === c.merchId); return `<div class="merch-request">${uiIcon(item.icon)}<div><strong>${c.merchReceived ? 'Đã nhận' : 'Khách muốn mua thêm'} ${escapeHtml(item.name)}</strong><small>${c.merchReceived ? 'Khách vui hơn · kiên nhẫn +10' : fullMoney(item.price) + ' · bán trước khi giao vé'}</small></div><button class="secondary-btn" data-action="sellMerch" ${c.merchReceived || !game.merchandiseStock[item.id] ? 'disabled' : ''}>${c.merchReceived ? 'Đã giao ✓' : 'Giao đồ'}</button></div>`; })() : ''}
    <div class="ticket-shelf-heading"><span>CHẠM Ô VÉ ĐỂ IN & GIAO CHO KHÁCH</span><small>Khách muốn: <b>${escapeHtml(zone.name)}</b> · Thuế game 5% tính khi bán</small></div>
    <div class="ticket-shelf">${['Đặc biệt','Đứng','Ngồi'].map(group => `<div class="ticket-group"><b>${group}</b><div class="ticket-grid">${game.zones.filter(z => z.group === group).map(z => renderTicketTile(z, c)).join('')}</div></div>`).join('')}</div>
  </section>`;
}

function renderPlay() {
  return renderCompactPlay();
}

function renderCompactPlay() {
  const c = game.queue.find(item => item.id === game.selectedCustomerId);
  const zone = c && zoneById(c.zoneId);
  const item = c?.merchId && game.merchandise.find(m => m.id === c.merchId);
  const invalid = c?.scanned && (['bot','duplicate'].includes(c.kind) || c.kind === 'payment' && !c.resolved);
  const soldOut = game.zones.every(z => game.stock[z.id] === 0);
  const result = !c ? soldOut ? 'Hết vé · khách đã về. Nhập kho để đón khách mới.' : 'Chọn khách đang chờ để phục vụ.' : !c.scanned ? 'Chạm Xác minh trước khi giao vé.' : c.kind === 'bot' ? '⚠ Bot chen vào · chặn yêu cầu!' : c.kind === 'duplicate' ? '⚠ Mã trùng · chặn yêu cầu!' : c.kind === 'payment' && !c.resolved ? '⚠ Chưa thanh toán · thanh toán lại!' : '✓ Vé hợp lệ · chạm đúng khu để giao.';
  return `<section class="live-workbench" aria-label="Quầy bán vé trong một màn hình">
    <div class="compact-hud"><div><strong>Ngày ${game.shift}<small> / ${game.totalShifts}</small></strong><span>1s thực = ${game.gameTimeRate}s game</span></div><div><small>GIỜ GAME</small><b data-game-clock>${gameClock()}</b></div><div><small>CÒN · THỰC</small><b data-real-countdown>${countdown(game.secondsLeft)}</b></div><div><small>DOANH THU</small><b>${money(game.revenue)}</b><span>Combo ×${game.combo}</span></div><div class="compact-reputation ${game.reputation < 50 ? 'critical' : ''}"><small>UY TÍN</small><b>♥ ${game.reputation}<small>/100</small></b></div></div>
    ${game.reputation < 50 ? `<div class="reputation-warning" role="alert">Uy tín ${game.reputation}/100 · −100.000đ mỗi 10s thực. Về 0 phải chơi lại.</div>` : ''}
    <div class="compact-queue" aria-label="Hàng chờ">${game.queue.length ? game.queue.map(person => `<button class="queue-chip ${person.id === c?.id ? 'selected' : ''}" data-action="selectCustomer" data-id="${person.id}" aria-label="Chọn khách ${escapeHtml(person.name)}"><img src="${customerArt(person)}" alt=""><span>${escapeHtml(person.name)}</span><i><b data-customer-patience="${person.id}" style="width:${Math.max(0,person.patience)}%"></b></i></button>`).join('') : `<span>${soldOut ? 'Hết vé · ghé Kho để nhập thêm' : 'Khách đang tới quầy…'}</span>`}</div>
    <div class="compact-customer card"><div class="scene-customer"><img src="${c ? customerArt(c, true) : 'assets/hosts/mc-tran-ngoc-full.svg'}" alt="Chibi ${escapeHtml(c?.name || 'MC Trần Ngọc')}" draggable="false"></div><div class="compact-order"><small>${c ? escapeHtml(c.name) : 'MC TRẦN NGỌC · CHÀO BẠN'}${c?.golden ? ' · ★ VÉ VÀNG' : ''}</small><h2>${c ? `Cho mình <b>${c.qty} vé ${escapeHtml(zone.name)}</b> nhé!` : 'Quầy sẵn sàng đón khách!'}</h2><span>${c ? `Tổng ${fullMoney(Math.round(zone.price * c.qty * (1 + game.taxRate)))} · gồm thuế game` : 'Nhập thêm vé trong Kho nếu hàng đã hết.'}</span>${c ? `<div class="compact-patience"><small>KIÊN NHẪN</small><i><b data-customer-patience="${c.id}" style="width:${Math.max(0,c.patience)}%"></b></i></div>` : ''}<p class="compact-scan ${invalid ? 'alert' : c?.scanned ? 'valid' : ''}">${result}</p></div></div>
    <div class="compact-actions"><button class="secondary-btn" data-action="scan" ${!c || c.scanned ? 'disabled' : ''}>${uiIcon('scanner')} Xác minh</button><button class="secondary-btn" data-action="retryPayment" ${!c || !c.scanned || c.kind !== 'payment' || c.resolved ? 'disabled' : ''}>${uiIcon('payment')} Thanh toán lại</button><button class="danger-btn" data-action="reject" ${!c ? 'disabled' : ''}>Chặn yêu cầu</button></div>
    ${item ? `<div class="compact-merch">${uiIcon(item.icon)}<span>${c.merchReceived ? 'Đã giao' : 'Mua thêm'} ${escapeHtml(item.name)} · ${money(item.price)}</span><button data-action="sellMerch" ${c.merchReceived || !game.merchandiseStock[item.id] ? 'disabled' : ''}>${c.merchReceived ? 'Đã nhận ✓' : 'Giao đồ'}</button></div>` : ''}
    ${game.incident ? `<div class="compact-incident" role="alert"><span>${game.incident.kind === 'fare' ? 'Có người vào không vé' : 'Có báo cáo mất đồ'} · <b data-incident-timer>${Math.ceil(game.incident.remaining)}s</b></span><button data-action="dispatchSecurity">${uiIcon('security')} Bảo vệ</button></div>` : ''}
    <div class="compact-ticket-tray"><div class="compact-ticket-heading"><strong>CHỌN VÉ ĐỂ GIAO</strong><span>${c ? `Cần ${c.qty} vé · ${escapeHtml(zone.name)}` : '16 khu vé concert'}</span></div><div class="compact-ticket-grid">${game.zones.map(z => c ? renderTicketTile(z,c) : `<button class="ticket-tile" disabled style="--ticket-color:${z.color}"><span class="ticket-stub" aria-hidden="true"><b>VÉ</b></span><span class="ticket-face"><strong>${escapeHtml(z.name)}</strong><span>${money(z.price)}</span><em>Còn ${game.stock[z.id]}</em></span></button>`).join('')}</div></div>
  </section>`;
}

function renderExpandedPlay() {
  const incident = game.incident;
  return `${renderHud()}${incident ? `<section class="incident-banner" role="alert"><span>🚨</span><div><strong>${incident.kind === 'fare' ? 'CÓ NGƯỜI ĐỊNH VÀO CONCERT KHÔNG VÉ' : 'CÓ BÁO CÁO MẤT ĐỒ TẠI CONCERT'}</strong><small>Điều phối bảo vệ trước khi hết <b data-incident-timer>${Math.ceil(incident.remaining)}s</b></small></div><button data-action="dispatchSecurity">Điều phối ➜</button></section>` : ''}<div class="play-grid"><div class="play-main">${renderQueue()}${renderDesk()}</div><aside class="sidebar-panel"><div class="mini-map card"><div class="mini-map-header"><span>▦ SƠ ĐỒ VÉ</span><button data-view="map">Xem tất cả</button></div><div class="stage-mini">SÂN KHẤU</div><div class="mini-zone-grid">${game.zones.slice(0, 8).map(z => `<button data-action="selectZone" data-id="${z.id}" style="--zone:${z.color}" class="${game.selectedZoneId === z.id ? 'picked' : ''}" title="${escapeHtml(z.name)}">${escapeHtml(z.name)}</button>`).join('')}</div></div><div class="shift-tip card"><span>✦ ĐỘI VẬN HÀNH</span><p>Nhân viên kiểm vé giúp xác minh, marketing kéo khách tới và bảo vệ xử lý sự cố ở concert.</p><button class="secondary-btn" data-view="staff">Quản lý nhân viên ➜</button></div></aside></div>`;
}

function renderUpgrade(key, title, description, prices, glyph) {
  const level = game.upgrades[key];
  const cost = prices[level];
  return `<div class="upgrade"><span class="upgrade-icon">${uiIcon(glyph)}</span><div class="upgrade-copy"><strong>${title}</strong><small>${description}</small><span>Cấp ${level}/2</span></div><button data-action="upgrade" data-id="${key}" ${level >= 2 || game.cash < cost ? 'disabled' : ''}>${level >= 2 ? 'Tối đa' : money(cost)}</button></div>`;
}

function renderIntermission() {
  const intro = game.phase === 'intro';
  const complete = game.phase === 'complete';
  const reward = game.lastCollectionReward;
  return `${renderHud()}<section class="intermission card ${intro ? 'with-logo' : ''}"><div class="poster-glow"></div>${intro ? '<img class="concert-logo-poster" src="assets/logo-concert.png" alt="Biểu trưng Anh Trai Vượt Ngàn Chông Gai 2026 trên nền lửa" />' : ''}<span class="eyebrow">${intro ? `ĐỢT ${game.campaign} · CONCERT` : complete ? 'HOÀN THÀNH ĐỢT BÁN' : `KẾT THÚC NGÀY ${game.shift}`}</span><h2>${intro ? 'BẠN LÀ NGƯỜI GIỮ NHỊP<br><em>PHÒNG VÉ.</em>' : complete ? 'HẸN GẶP Ở<br><em>SÂN KHẤU!</em>' : 'MỘT CA BÁN<br><em>RỰC LỬA.</em>'}</h2><p>${intro ? 'Mỗi ngày bán nhận một lượt chọn thẻ bí ẩn trong mục Anh tài. Tên nhân vật chỉ lộ diện sau khi bạn chạm thẻ.' : complete ? `Bạn đã phát hành ${game.sold} vé. Bộ sưu tập hiện có ${game.collectedArtists.length}/34 anh tài; vào mục Anh tài để dùng lượt mở thẻ, rồi chơi đợt mới.` : 'Quầy đã đóng. Vé và merchandise đã bán vẫn bị trừ khỏi kho; nhập hàng rồi chuẩn bị ngày bán tiếp theo.'}</p><div class="poster-metrics"><div><strong>${game.sold}</strong><small>VÉ ĐÃ BÁN</small></div><div><strong>${game.botsStopped}</strong><small>GIAO DỊCH CHẶN</small></div><div><strong>${game.bestCombo}</strong><small>COMBO KỶ LỤC</small></div></div><p class="reputation-rules">Uy tín dưới 50: −100.000đ mỗi 10s thực đang bán. Uy tín về 0: chơi lại từ đầu.</p>${!intro ? `<div class="shift-reward">${game.missionWon ? '★ Nhiệm vụ hoàn thành · +750.000đ' : `✦ Nhiệm vụ: ${game.shiftSales}/${game.missionTarget} khách`}</div>` : ''}${game.pendingReveals && !intro ? `<button class="secondary-btn reveal-entry" data-view="artists">✦ ${game.pendingReveals} lượt mở thẻ bí ẩn · Vào mục Anh tài</button>` : ''}${reward && !intro ? `<div class="collection-reveal card"><img src="${chibiOf(reward.artistId)}" alt="Avatar chibi ${escapeHtml(reward.name)}"><div><small>ANH TÀI VỪA MỞ KHÓA</small><strong>${escapeHtml(reward.name)}</strong><span>${reward.badgeUnlocked ? 'Đủ 34 người — huy hiệu Gai Con đã mở!' : `Bộ sưu tập ${game.collectedArtists.length}/34`}</span></div><button data-view="artists" class="secondary-btn">Xem bộ sưu tập</button></div>` : ''}${!complete ? `<button class="primary-btn start-btn" data-action="start">${intro ? 'BẮT ĐẦU MỞ BÁN' : 'VÀO NGÀY TIẾP THEO'} <span>✦</span></button>` : `<button class="primary-btn start-btn" data-action="nextCampaign">CHƠI ĐỢT TIẾP THEO <span>✦</span></button>`}</section>
  <div class="intermission-links"><button class="secondary-btn" data-view="staff">${uiIcon('staff')} Thuê nhân viên & nộp thuế game</button><button class="secondary-btn" data-view="feedback">${uiIcon('feedback')} Xem lời nhắn của khách</button></div>
  ${!complete ? `<section class="upgrade-panel"><div class="section-heading"><h2>Nâng cấp quầy vé</h2><span>Ngân sách ${fullMoney(game.cash)}</span></div><div class="upgrades card">${renderUpgrade('scanner', 'Máy xác minh', 'Giảm hao kiên nhẫn khi xác minh', [2000000,4000000], 'scanner')}${renderUpgrade('queue', 'Điều phối hàng chờ', 'Thêm chỗ và giảm khách bỏ đi', [2500000,5000000], 'queue')}${renderUpgrade('payment', 'Cổng thanh toán', 'Giảm hao kiên nhẫn khi xử lý lại', [1500000,3000000], 'payment')}</div></section>` : ''}`;
}

function renderBreak() {
  return `<section class="pause-screen card"><span class="pause-emblem">${uiIcon('pause')}</span><span class="eyebrow">${game.exited ? 'ĐÃ LƯU VÀ THOÁT' : 'ĐANG TẠM DỪNG'}</span><h1>${game.exited ? 'Hẹn gặp lại!' : 'Nghỉ một chút nhé'}</h1><p>${game.exited ? 'Tiến trình đã lưu trên máy chủ. Bạn có thể đóng tab và quay lại khi muốn tiếp tục.' : 'Đồng hồ, hàng chờ, sự cố và tiền phạt đã tạm dừng. Tiếp tục khi bạn sẵn sàng.'}</p><div class="pause-metrics"><span>Ngày <b>${game.shift}/${game.totalShifts}</b></span><span>Còn <b>${countdown(game.secondsLeft)} thực</b></span><span><b>${game.queue.length}</b> khách đang chờ</span></div><button class="primary-btn" data-action="resume">▶ Tiếp tục chơi</button>${!game.exited ? `<button class="secondary-btn" data-view="inventory">Nhập kho trong lúc nghỉ</button>${game.phase === 'playing' ? '<button class="danger-btn" data-action="endDay">Kết thúc ngày bán</button><p class="end-day-note">Đóng quầy ngay và xem kết quả ngày bán. Vé và merchandise đã bán vẫn bị trừ; nhập kho để bổ sung cho ngày sau.</p>' : ''}` : ''}</section>`;
}

function renderGameOver() {
  return `<section class="pause-screen gameover-screen card"><span class="pause-emblem">${uiIcon('security')}</span><span class="eyebrow">QUẦY ĐÃ ĐÓNG CỬA</span><h1>Uy tín đã về 0</h1><p>Khách đã mất niềm tin. Chơi lại sẽ đưa ngày bán, ngân sách, kho hàng, nâng cấp và bộ sưu tập anh tài về ban đầu.</p><div class="pause-metrics"><span>Ngày <b>${game.shift}/${game.totalShifts}</b></span><span>Đã bán <b>${game.sold} vé</b></span><span>Tiền phạt <b>${fullMoney(game.reputationPenaltyPaid)}</b></span></div><button class="primary-btn" data-action="reset">Chơi lại từ đầu</button></section>`;
}

function renderInventory() {
  return `<section class="page-heading"><span class="eyebrow">KHO PHÒNG VÉ</span><h1>Nhập hàng & trưng bày</h1><p>Nhập vé còn thiếu, bày đồ cổ vũ để khách ghé đông hơn. ${game.paused ? 'Ca bán đang được tạm dừng.' : 'Chọn Tạm dừng nếu cần thời gian chuẩn bị.'}</p><div class="inventory-summary"><span>Ngân sách <b>${fullMoney(game.cash)}</b></span><span>Sức hút <b>+${game.attraction}%</b></span><span>Đồ đã bán <b>${game.merchandiseSold}</b></span></div></section><section><div class="section-heading"><h2>Gian merchandise</h2><span>Nhập 5 món mỗi kiện</span></div><div class="merch-grid">${game.merchandise.map(item => { const count = game.merchandiseStock[item.id]; const displayed = game.merchandiseDisplay[item.id]; return `<article class="merch-card card"><div class="merch-illustration">${uiIcon(item.icon)}</div><small>${displayed && count ? 'ĐANG TRƯNG BÀY' : count ? 'TRONG KHO' : 'CHƯA NHẬP HÀNG'}</small><h2>${escapeHtml(item.name)}</h2><p>Còn <b>${count}</b> món · bán ${fullMoney(item.price)}/món<br>Sức hút +${item.attraction}% khi có hàng trưng bày</p><button class="primary-btn" data-action="restockMerch" data-id="${item.id}" ${game.cash < item.cost || count > 45 ? 'disabled' : ''}>Nhập ${item.pack} · ${money(item.cost)}</button><button class="secondary-btn" data-action="displayMerch" data-id="${item.id}" ${!count && !displayed ? 'disabled' : ''}>${displayed ? 'Cất trưng bày' : 'Trưng bày hút khách'}</button></article>`; }).join('')}</div></section><section class="ticket-stock-section"><div class="section-heading"><h2>Bổ sung vé từng khu</h2><span>${game.zones.length} loại vé</span></div><p class="inventory-note">Chi phí nhập bằng 15% giá vé trong game. Mỗi kho chứa tối đa 4 lần số vé ban đầu.</p><div class="stock-grid">${game.zones.map(zone => `<article class="stock-card card" style="--stock-color:${zone.color}"><div class="stock-ticket"><span>HỎA TÂM · LIVE</span><strong>${escapeHtml(zone.name)}</strong><small>Còn ${game.stock[zone.id]} / ${zone.stock * 4} vé</small></div><div class="stock-actions">${[5,10].map(qty => { const cost = Math.round(zone.price * .15) * qty; return `<button class="secondary-btn" data-action="restockTickets" data-id="${zone.id}" data-qty="${qty}" ${game.cash < cost || game.stock[zone.id] + qty > zone.stock * 4 ? 'disabled' : ''}>+${qty} vé <small>${money(cost)}</small></button>`; }).join('')}</div></article>`).join('')}</div></section>`;
}

function renderStaff() {
  const roles = [
    ['checker', 'Nhân viên kiểm vé', 'Tự xác minh 70% đơn ở cấp 1; cấp 2 tự chặn bot và mã trùng.', 'checker'],
    ['marketing', 'Nhân viên marketing', 'Khách tới nhanh hơn 15% mỗi cấp, tip khi bán tăng 100.000đ mỗi cấp.', 'marketing'],
    ['security', 'Bảo vệ concert', 'Cấp 1 tự xử lý 65% sự cố; cấp 2 tự xử lý toàn bộ. Có thể điều phối thủ công.', 'security']
  ];
  return `<section class="page-heading"><span class="eyebrow">HẬU TRƯỜNG HỎA TÂM</span><h1>Đội vận hành</h1><p>Thuê người để quầy và concert hoạt động nhịp nhàng hơn. Ngân sách hiện có: <b>${fullMoney(game.cash)}</b>.</p></section><div class="staff-grid">${roles.map(([key,title,detail,glyph]) => { const level = game.staff[key]; const cost = game.staffCosts[key]?.[level]; return `<article class="staff-card card"><span class="staff-icon">${uiIcon(glyph)}</span><div><small>NHÂN SỰ · CẤP ${level}/2</small><h2>${title}</h2><p>${detail}</p></div><button data-action="hireStaff" data-id="${key}" class="primary-btn" ${level >= 2 || game.cash < cost ? 'disabled' : ''}>${level >= 2 ? 'Đã tối đa' : `Thuê · ${fullMoney(cost)}`}</button></article>`; }).join('')}</div><section class="tax-card card"><div><span class="eyebrow">SỔ THUẾ TRONG GAME</span><h2>Đối soát thuế vé</h2><p>Thuế mô phỏng 5% được cộng khi bán vé, giữ trong quỹ thuế rồi nộp giữa các ca. Đây là quy tắc trò chơi.</p></div><div class="tax-numbers"><div><small>ĐÃ THU</small><strong>${fullMoney(game.taxCollected)}</strong></div><div><small>CẦN NỘP</small><strong>${fullMoney(game.taxDue)}</strong></div><div><small>ĐÃ NỘP</small><strong>${fullMoney(game.taxRemitted)}</strong></div></div><button data-action="remitTax" class="primary-btn" ${game.phase === 'playing' || !game.taxDue || game.cash < game.taxDue ? 'disabled' : ''}>Nộp quỹ thuế ${game.taxDue ? fullMoney(game.taxDue) : ''} ➜</button><small>${game.phase === 'playing' ? 'Nộp thuế sau khi kết thúc ca.' : game.taxDue ? 'Hoàn tất trước ca mới để giữ uy tín.' : 'Quỹ đã được đối soát.'}</small></section>`;
}

function renderMap() {
  const selected = mapSelectedZoneId ? zoneById(mapSelectedZoneId) : null;
  return `<section class="page-heading"><span class="eyebrow">CONCERT · THÀNH PHỐ HỒ CHÍ MINH</span><h1>Sơ đồ concert</h1><p>Chạm vào khu trên sơ đồ bạn gửi để xem giá và số vé còn lại. Hai bên mang cùng tên khu được gộp thành một loại vé trong game.</p></section>
  <div class="map-layout reference-map-layout"><div class="map-board reference-map-board card"><div class="map-toolbar"><strong>✦ SƠ ĐỒ CHỖ NGỒI & KHU ĐỨNG</strong></div>${selected ? `<div class="map-selection-ribbon"><b>${escapeHtml(selected.name)}</b><span>${fullMoney(selected.price)} · Còn ${game.stock[selected.id]} vé</span></div>` : ''}<div class="concert-plan-scroll"><div class="concert-plan"><img src="assets/concert-map-reference.png" alt="Sơ đồ concert với sân khấu, các khu đứng, khu ngồi và bảng giá" draggable="false">${mapHotspots.map(([id,x,y,w,h]) => { const z = zoneById(id); return `<button class="map-hotspot ${selected?.id === id ? 'picked' : ''}" data-map-zone="${id}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="Xem khu ${escapeHtml(z.name)}"></button>`; }).join('')}</div></div><small class="map-instruction">Chạm vùng màu để xem chi tiết vé.</small></div>
  <aside class="map-side card"><span class="eyebrow">CHI TIẾT VÉ</span>${selected ? `<div class="zone-detail-color" style="background:${selected.color}"></div><h3>${escapeHtml(selected.name)}</h3><p>${selected.group} · ${fullMoney(selected.price)} / vé</p><strong>Còn ${game.stock[selected.id]} vé trong game</strong><button data-view="play" class="primary-btn">Về quầy bán vé ➜</button>` : `<h2>Chọn một khu</h2><p>Chạm màu trên sơ đồ hoặc chọn một ô giá bên dưới.</p>`}<div class="reference-note">Sơ đồ dùng ảnh bạn cung cấp. Giá và lượng vé là dữ liệu mô phỏng; game không bán vé thật.</div></aside></div>
  <section class="map-price-list"><div class="section-heading"><h2>Giá từng loại vé</h2><span>Chạm ô để xem khu</span></div><div class="map-price-grid">${game.zones.map(z => `<button data-map-zone="${z.id}" class="map-price-card map-ticket ${selected?.id === z.id ? 'picked' : ''}" style="--zone:${z.color}" aria-label="Khu ${escapeHtml(z.name)}, ${fullMoney(z.price)}, còn ${game.stock[z.id]} vé"><span class="map-ticket-stub" aria-hidden="true"><b>VÉ</b><i></i><small>2026</small></span><span class="map-ticket-face"><small>HỎA TÂM · CONCERT</small><span>${escapeHtml(z.name)}</span><strong>${fullMoney(z.price)}</strong><small>Còn ${game.stock[z.id]} vé</small></span></button>`).join('')}</div></section>`;
}

function renderArtists() {
  const total = game.artists.length;
  const owned = new Set(game.collectedArtists || []);
  const slots = game.artistSlots || {};
  const pending = game.pendingReveals || 0;
  const gaiConLogo = `<svg class="gai-con-logo" viewBox="260 270 1120 1160" role="img" aria-label="Logo ban tổ chức"><image href="assets/logo-concert.png" width="1638" height="2048" /></svg>`;
  return `<section class="page-heading artist-heading"><span class="eyebrow">BỘ SƯU TẬP ANH TÀI</span><h1>34 anh tài</h1><p>Kết thúc một ca để nhận một lượt chọn thẻ. Hãy chạm bất kỳ ô bí ẩn nào; tên anh tài chỉ xuất hiện sau khi mở.</p><div class="artist-progress"><span style="width:${owned.size / total * 100}%"></span></div><small>Đã sở hữu ${owned.size}/${total} anh tài · ${pending} lượt mở thẻ</small>${pending ? `<div class="reveal-prompt">✦ Bạn có <b>${pending} lượt</b>. Chọn một ô có dấu hỏi bên dưới để khám phá anh tài!</div>` : ''}<button class="art-toggle" data-toggle-art>${artistArt === 'chibi' ? 'Xem ảnh gốc' : 'Xem chibi'} ↔</button></section><section class="gai-con-badge card ${game.gaiConBadge ? 'earned' : 'locked'}"><span class="gai-con-art">${game.gaiConBadge ? gaiConLogo : '✦'}</span><div><small>HUY HIỆU BỘ SƯU TẬP</small><h2>Gai Con</h2><p>${game.gaiConBadge ? 'Đã mở khóa! Bạn đã sở hữu đủ avatar và chibi của 34 anh tài.' : `Còn ${total - owned.size} anh tài để mở huy hiệu với logo game.`}</p></div></section>${game.lastCollectionReward ? `<div class="collection-reveal card"><img src="${chibiOf(game.lastCollectionReward.artistId)}" alt=""><div><small>VỪA HÉ LỘ TỪ THẺ #${game.lastCollectionReward.slot || '?'}</small><strong>${escapeHtml(game.lastCollectionReward.name)}</strong><span>${game.lastCollectionReward.badgeUnlocked ? 'Huy hiệu Gai Con đã mở khóa!' : 'Avatar và chibi đã thuộc bộ sưu tập của bạn.'}</span></div></div>` : ''}<div class="artist-grid collection-grid">${Array.from({ length: total }, (_, i) => {
    const slot = i + 1;
    const artistId = Number(slots[slot]);
    const id = String(slot).padStart(2, '0');
    if (!artistId) return `<button class="artist-card mystery-card locked ${pending ? 'can-reveal' : ''}" data-action="unlockArtist" data-slot="${slot}" ${pending ? '' : 'disabled'} aria-label="Mở thẻ bí ẩn số ${id}"><span class="artist-number">#${id}</span><div class="artist-medal artist-secret" aria-hidden="true">?</div><strong>Anh tài bí ẩn</strong><small>${pending ? 'CHẠM ĐỂ MỞ' : 'CHƯA SỞ HỮU'}</small></button>`;
    const name = game.artists[artistId - 1];
    const chibi = chibiOf(artistId);
    const full = chibiFullOf(artistId);
    const portrait = portraits[String(artistId).padStart(2, '0')];
    return `<article class="artist-card collection-card ${artistArt === 'chibi' ? 'chibi-card' : 'photo-card'} unlocked ${game.lastCollectionReward?.artistId === artistId ? 'just-unlocked' : ''}"><span class="artist-number">#${id}</span><div class="artist-medal">${artistArt === 'photo' && portrait ? portraitOf(artistId, name) : `<img src="${chibi}" alt="Avatar chibi ${escapeHtml(name)}" loading="lazy">`}</div><strong>${escapeHtml(name)}</strong><img class="owned-full-chibi" src="${full}" alt="Chibi toàn thân ${escapeHtml(name)}" loading="lazy"><small>ĐÃ SỞ HỮU</small></article>`;
  }).join('')}</div><section class="guest-card host-card card"><img class="host-chibi" src="assets/hosts/mc-tran-ngoc-full.svg" alt="Chibi MC Trần Ngọc mặc vest đen, cà vạt kẻ và cầm micro" loading="lazy"><div><span class="eyebrow">HOST · THẺ KHÁCH MỜI</span><h2>MC Trần Ngọc</h2><p>Người dẫn chương trình có thẻ riêng, không nằm trong 34 thẻ sưu tầm.</p><img class="host-reference" src="assets/artists/MC_Tran_Ngoc.jpg" alt="Ảnh tham chiếu MC Trần Ngọc" loading="lazy"></div></section>`;
}

function renderRecords() {
  const stats = [['DOANH THU', fullMoney(game.revenue)],['VÉ ĐÃ PHÁT HÀNH', game.sold],['KHÁCH PHỤC VỤ', game.served],['TIP NHẬN ĐƯỢC', fullMoney(game.tips || 0)],['ĐƠN VÉ VÀNG', game.goldenServed || 0],['BOT / MÃ TRÙNG ĐÃ CHẶN', game.botsStopped],['SỰ CỐ ĐÃ XỬ LÝ', game.securityCaught],['SỰ CỐ BỎ LỠ', game.securityMissed],['THUẾ ĐÃ THU', fullMoney(game.taxCollected)],['THUẾ CẦN NỘP', fullMoney(game.taxDue)],['THUẾ ĐÃ NỘP', fullMoney(game.taxRemitted)],['LỖI VẬN HÀNH', game.errors]];
  return `<section class="page-heading"><span class="eyebrow">DỮ LIỆU ĐƯỢC LƯU TỰ ĐỘNG</span><h1>Nhật ký quầy vé</h1></section><div class="record-grid">${stats.map(([label,value]) => `<div class="record-card card"><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><section class="log card"><h2>Diễn biến gần đây</h2>${game.log.length ? game.log.map(entry => `<div class="log-row ${entry.tone}"><span>✦</span><p>${escapeHtml(entry.message)}</p><time>${new Date(entry.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('') : '<p>Chưa có giao dịch nào.</p>'}</section>`;
}

function renderFeedback() {
  const items = game.feedback || [];
  const unanswered = items.filter(item => !item.reply).length;
  return `<section class="page-heading feedback-heading"><span class="eyebrow">HỘP THƯ QUẦY VÉ</span><h1>Khách nói gì?</h1><p>Sau khi nhận vé, các anh tài để lại nhận xét. Bạn là admin của quầy: trả lời để chăm sóc khách và lấy lại uy tín.</p><div class="feedback-summary"><span>${uiIcon('feedback')} ${items.length} nhận xét</span><span>● ${unanswered} chưa trả lời</span><span>★ ${items.length ? (items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1) : '—'} / 5</span></div></section>
  ${items.length ? `<div class="feedback-list">${items.map(item => `<article class="feedback-card card"><div class="feedback-head"><img src="${customerArt(item)}" alt="Chibi ${escapeHtml(item.name)}"><div><strong>${escapeHtml(item.name)}</strong><small>Vé ${escapeHtml(zoneById(item.zoneId)?.name || 'concert')} · ${new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></div><span class="feedback-stars" aria-label="${item.rating} trên 5 sao">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</span></div><p>“${escapeHtml(item.message)}”</p>${item.reply ? `<div class="admin-reply"><small>✦ ADMIN HỎA TÂM ĐÃ TRẢ LỜI</small><p>${escapeHtml(item.reply)}</p></div>` : `<form class="reply-form" data-feedback-id="${item.id}"><label for="reply-${item.id}">Trả lời khách</label><textarea class="reply-input" id="reply-${item.id}" name="reply" maxlength="220" required placeholder="Cảm ơn bạn đã ghé quầy…"></textarea><div class="reply-tools"><button type="button" data-quick-reply="Cảm ơn bạn! Quầy Hỏa Tâm rất vui được phục vụ. Hẹn gặp bạn ở concert nhé!">Cảm ơn ✦</button><button type="button" data-quick-reply="Quầy xin lỗi vì để bạn chờ lâu. Chúng mình sẽ phục vụ nhanh hơn ở lần tới!">Xin lỗi ♥</button><button type="submit" class="primary-btn">Gửi trả lời ➜</button></div></form>`}</article>`).join('')}</div>` : `<section class="feedback-empty card"><span>✉</span><h2>Hộp thư đang chờ</h2><p>Phát hành vé cho khách đầu tiên để nhận phản hồi.</p><button class="primary-btn" data-view="play">Về quầy vé</button></section>`}`;
}

function render() {
  if (!game) return;
  const serving = view === 'play' && game.phase === 'playing' && !game.paused && !game.exited;
  if (serving && !document.querySelector('.live-workbench')) window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.classList.toggle('serving-viewport', serving);
  app.innerHTML = game.phase === 'gameover' ? renderGameOver() : game.exited ? renderBreak() : view === 'map' ? renderMap() : view === 'artists' ? renderArtists() : view === 'feedback' ? renderFeedback() : view === 'records' ? renderRecords() : view === 'staff' ? renderStaff() : view === 'inventory' ? renderInventory() : game.paused ? renderBreak() : game.phase === 'playing' ? renderPlay() : renderIntermission();
  document.querySelector('#pauseButton').hidden = game.exited || game.phase === 'gameover';
  document.querySelector('#pauseButton').dataset.action = game.paused ? 'resume' : 'pause';
  document.querySelector('#pauseButton').innerHTML = game.paused ? '▶ Tiếp tục' : `${uiIcon('pause')} Tạm dừng`;
  document.querySelector('.bottom-nav').hidden = game.exited || game.phase === 'gameover';
  document.body.classList.toggle('game-paused', game.paused);
  if (game.paused || game.phase === 'gameover') stopBackgroundMusic();
  syncBackgroundButton();
  renderStamp = stateStamp();
  document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('nav-active', button.dataset.view === view));
  const artistsNav = document.querySelector('.bottom-nav [data-view="artists"]');
  if (artistsNav) artistsNav.dataset.pending = String(game.pendingReveals || 0);
}

function openModal(type) {
  if (type === 'help') modalContent.innerHTML = `<span class="eyebrow">SỔ TAY VẬN HÀNH</span><h2>Cách chơi</h2><ol><li>Chọn khách chibi trong hàng chờ và đọc khu vé họ đặt.</li><li>Nhấn <b>Xác minh</b> để phát hiện bot chen vào phiên, mã trùng hoặc lỗi thanh toán.</li><li>Với thanh toán lỗi, nhấn <b>Thanh toán lại</b>. Với phiên bị bot chen vào hoặc mã trùng, chọn <b>Chặn yêu cầu</b>.</li><li>Chạm trực tiếp <b>ô vé đúng khu</b>. Máy in sẽ chuyển vé tới khách.</li><li>Thuê nhân viên kiểm vé, marketing và bảo vệ trong mục <b>Nhân viên</b>. Điều phối bảo vệ khi có cảnh báo sự cố.</li><li>Sau ca, nộp quỹ thuế mô phỏng 5%. Ghé <b>Góp ý</b> trả lời khách và cải thiện uy tín.</li><li>Ghé <b>Kho</b> để nhập vé, lightstick, áo và banner. Trưng bày hàng để hút khách; bán vật phẩm khách đặt trước khi giao vé.</li><li>Dùng <b>Tạm dừng</b> khi bận, rồi <b>Tiếp tục chơi</b> hoặc <b>Kết thúc ngày bán</b> để đóng quầy ngay; hàng đã bán vẫn bị trừ. Mở <b>Cài đặt</b> để bật hoặc tắt âm thanh, lưu tiến trình, thoát và quản lý tài khoản.</li><li><b>Uy tín dưới 50:</b> trừ 100.000đ mỗi 10 giây thực đang bán. Tạm dừng sẽ dừng tiền phạt. <b>Uy tín bằng 0:</b> đóng quầy và phải chơi lại từ đầu.</li><li>Nếu khu khách muốn không còn đủ vé, khách sẽ về. Nhập kho để đón khách mới.</li></ol><p>Mỗi ngày bán vé dài 5 phút thực. Đồng hồ game chạy nhanh gấp 5 lần: 1 giây thực = 5 giây game. Vé, tiền, thuế, người thân và sự cố đều là tình huống game hư cấu.</p>`;
  else if (type === 'settings') modalContent.innerHTML = `<span class="eyebrow">HỆ THỐNG · TÀI KHOẢN</span><h2>Cài đặt</h2><div class="settings-list"><button id="settingsSound" class="secondary-btn">${soundOn ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt'}</button><button id="settingsSave" class="secondary-btn">Lưu tiến trình ngay</button><button id="settingsExit" class="secondary-btn">Lưu và thoát game</button><button id="settingsHelp" class="secondary-btn">Hướng dẫn chơi</button><button id="settingsReset" class="danger-btn">Chơi lại từ đầu</button></div><div class="settings-account"><h3>Tài khoản ${session.loggedIn ? `· ${escapeHtml(session.username)}` : '· khách'}</h3>${session.loggedIn ? '<p>Tiến trình đang lưu trên máy chủ này dưới tài khoản của bạn.</p><button id="settingsLogout" class="secondary-btn">Đăng xuất</button>' : '<p>Tạo tài khoản trên máy chủ này để lưu tiến trình riêng. Đăng ký sẽ sao chép tiến trình khách hiện tại.</p><form id="accountForm"><label>Tên tài khoản<input name="username" autocomplete="username" minlength="3" maxlength="24" required></label><label>Mật khẩu<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><div class="modal-actions"><button class="primary-btn" type="submit" data-auth="login">Đăng nhập</button><button class="secondary-btn" type="submit" data-auth="register">Đăng ký</button></div><p id="accountError" role="alert"></p></form>'}</div><small class="settings-note">Tài khoản và tiến trình lưu trên máy chủ game tại nhà/trường này; không đồng bộ lên Internet.</small>`;
  else modalContent.innerHTML = `<span class="eyebrow">BẮT ĐẦU MỚI</span><h2>Xóa toàn bộ tiến trình?</h2><p>Ngày bán, tiền, kho, nhân viên, bộ sưu tập 34 anh tài, lượt mở thẻ và huy hiệu Gai Con sẽ trở về ban đầu. Tài khoản đăng nhập vẫn được giữ.</p><div class="modal-actions"><button class="secondary-btn" id="cancelReset">Giữ tiến độ</button><button class="danger-btn" id="confirmReset">Xóa và chơi lại</button></div>`;
  if (!modal.open) modal.showModal();
}

async function loadSession() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (response.ok) session = await response.json();
  } catch { /* guest mode still works without an account */ }
}

async function accountAction(type, username, password) {
  const errorBox = document.querySelector('#accountError');
  try {
    const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, username, password }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể xử lý tài khoản.');
    session = result;
    modal.close();
    view = 'play';
    seenEvent = 0;
    await refresh();
  } catch (error) {
    if (errorBox) errorBox.textContent = error.message;
    else { toast.textContent = error.message; toast.className = 'visible bad'; }
  }
}

document.addEventListener('click', event => {
  if (event.target.closest('button:not(:disabled)')) beep('click');
  if (event.target.closest('#settingsSound')) {
    soundOn = !soundOn;
    backgroundEnabled = soundOn;
    window.localStorage?.setItem('hoa-tam-sound', soundOn ? 'on' : 'off');
    if (soundOn) playBackgroundMusic(); else stopBackgroundMusic();
    openModal('settings');
    return;
  }
  if (event.target.closest('#settingsSave')) { modal.close(); act('saveNow'); return; }
  if (event.target.closest('#settingsExit')) { modal.close(); view = 'play'; stopBackgroundMusic(); act('exitGame'); return; }
  if (event.target.closest('#settingsReset')) { openModal('reset'); return; }
  if (event.target.closest('#settingsHelp')) { openModal('help'); return; }
  if (event.target.closest('#settingsLogout')) { accountAction('logout'); return; }
  const quick = event.target.closest('[data-quick-reply]');
  if (quick) { const input = quick.closest('form')?.querySelector('.reply-input'); if (input) { input.value = quick.dataset.quickReply; input.focus(); } return; }
  const mapZone = event.target.closest('[data-map-zone]');
  if (mapZone) { mapSelectedZoneId = mapZone.dataset.mapZone; render(); return; }
  if (event.target.closest('[data-toggle-art]')) { artistArt = artistArt === 'chibi' ? 'photo' : 'chibi'; render(); return; }
  const modalButton = event.target.closest('[data-modal]');
  if (modalButton) {
    openModal(modalButton.dataset.modal);
    if (modalButton.dataset.modal === 'settings') {
      const priorSession = `${session.loggedIn}:${session.username || ''}`;
      loadSession().then(() => {
        if (`${session.loggedIn}:${session.username || ''}` !== priorSession && modal.open && document.querySelector('#settingsSound')) openModal('settings');
      });
    }
    return;
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { view = viewButton.dataset.view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const type = button.dataset.action;
  act(type, { id: type === 'selectCustomer' ? Number(button.dataset.id) : button.dataset.id, slot: Number(button.dataset.slot), qty: Number(button.dataset.qty) });
  if (type === 'selectZone' && view === 'map') view = 'play';
});

document.addEventListener('submit', event => {
  if (event.target.id === 'accountForm') {
    event.preventDefault();
    accountAction(event.submitter?.dataset.auth || 'login', event.target.elements.username.value, event.target.elements.password.value);
    return;
  }
  const form = event.target.closest('.reply-form');
  if (!form) return;
  event.preventDefault();
  act('replyFeedback', { id: Number(form.dataset.feedbackId), message: form.elements.reply.value });
});

const soundButton = document.querySelector('#soundButton');
const backgroundMusic = document.querySelector('#backgroundMusic');
const musicDock = document.querySelector('#musicDock');
const musicStart = 10;
let backgroundEnabled = soundOn;
let backgroundSource = null;
let backgroundBuffer = null;
let backgroundGain;
let backgroundMeter;
let backgroundOffset = 0;
let backgroundStartedAt = 0;
let audioToken = 0;
let audioLoading = false;
let audioFailed = false;
const audioStatus = document.querySelector('#audioStatus');
backgroundMusic.volume = 0.9;
backgroundMusic.muted = false;
const musicBytes = fetch(backgroundMusic.getAttribute('src')).then(response => {
  if (!response.ok) throw new Error('Không tải được nhạc');
  return response.arrayBuffer();
}).catch(() => null);

function backgroundPlaying() {
  return !!(backgroundSource && audioContext?.state === 'running' || !backgroundMusic.paused && backgroundMusic.readyState >= 2);
}

function syncBackgroundButton() {
  const playing = backgroundPlaying();
  audioStatus.dataset.state = playing ? 'playing' : audioLoading ? 'loading' : 'stopped';
  audioStatus.dataset.engine = backgroundSource ? 'webaudio' : 'media';
  audioStatus.textContent = playing ? '♪ Nhạc nền đang phát' : audioLoading ? 'Đang tải nhạc…' : audioFailed ? 'Không phát được · mở Cài đặt thử lại' : musicOpen ? 'Đang mở MV chủ đề' : game?.paused ? 'Nhạc tạm dừng cùng game' : backgroundEnabled ? 'Nhạc nền sẵn sàng' : 'Âm thanh đã tắt trong Cài đặt';
}

function stopBackgroundMusic() {
  audioToken++;
  audioLoading = false;
  if (backgroundSource) {
    backgroundOffset = (backgroundOffset + audioContext.currentTime - backgroundStartedAt) % backgroundBuffer.duration;
    backgroundSource.stop();
    backgroundSource.disconnect();
    backgroundSource = null;
  }
  backgroundMusic.pause();
  syncBackgroundButton();
}

async function playBackgroundMusic() {
  if (!backgroundEnabled || musicOpen || game?.paused || game?.exited || game?.phase === 'gameover' || document.hidden || backgroundPlaying() || audioLoading) return;
  const token = ++audioToken;
  audioLoading = true;
  audioFailed = false;
  syncBackgroundButton();
  try {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      let playbackSession = false;
      if (navigator.audioSession) {
        try { navigator.audioSession.type = 'playback'; playbackSession = true; } catch {}
      }
      // Older iOS uses the media element, which has a music playback audio session.
      if (!AudioEngine || isIOS && !playbackSession) {
      backgroundMusic.muted = false;
      await backgroundMusic.play();
        if (token !== audioToken || !backgroundEnabled || musicOpen || game?.paused || game?.phase === 'gameover' || document.hidden) backgroundMusic.pause();
    } else {
      // Resume immediately inside the tap handler, before loading or decoding.
      audioContext ||= new AudioEngine();
      const unlocked = audioContext.resume();
      await unlocked;
      if (audioContext.state !== 'running') throw new Error('Chờ thao tác người chơi');
        if (backgroundSource) return;
      if (!backgroundBuffer) {
        const bytes = await musicBytes;
        if (!bytes) throw new Error('Không tải được nhạc');
        backgroundBuffer = await audioContext.decodeAudioData(bytes.slice(0));
      }
      if (token !== audioToken || !backgroundEnabled || musicOpen || game?.paused || game?.phase === 'gameover' || document.hidden) return;
      backgroundGain ||= audioContext.createGain();
      backgroundMeter ||= audioContext.createAnalyser();
      backgroundMeter.fftSize = 256;
      backgroundGain.gain.value = 0.9;
      backgroundGain.disconnect();
      backgroundMeter.disconnect();
      backgroundGain.connect(backgroundMeter).connect(audioContext.destination);
      backgroundSource = audioContext.createBufferSource();
      backgroundSource.buffer = backgroundBuffer;
      backgroundSource.loop = true;
      backgroundSource.connect(backgroundGain);
      backgroundStartedAt = audioContext.currentTime;
      backgroundSource.start(0, backgroundOffset);
      audioContext.onstatechange = syncBackgroundButton;
    }
  } catch {
    if (token === audioToken) audioFailed = true;
  } finally {
    if (token === audioToken) { audioLoading = false; syncBackgroundButton(); }
  }
}

document.addEventListener('click', event => {
  if (!event.target.closest('#settingsSound')) playBackgroundMusic();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') playBackgroundMusic();
});
backgroundMusic.addEventListener('playing', syncBackgroundButton);
backgroundMusic.addEventListener('pause', syncBackgroundButton);
backgroundMusic.addEventListener('error', () => { audioFailed = true; syncBackgroundButton(); });
setInterval(() => {
  if (!backgroundSource || !backgroundMeter) return;
  const wave = new Float32Array(backgroundMeter.fftSize);
  backgroundMeter.getFloatTimeDomainData(wave);
  audioStatus.dataset.level = String(Math.max(...wave.map(Math.abs)));
}, 500);
syncBackgroundButton();

function toggleMusicDock() {
  musicOpen = !musicOpen;
  syncBackgroundButton();
  soundButton.classList.toggle('sound-on', musicOpen);
  soundButton.setAttribute('aria-label', musicOpen ? 'Đóng MV bài hát chủ đề' : 'Mở MV bài hát chủ đề');
  soundButton.setAttribute('aria-expanded', String(musicOpen));
  soundButton.title = musicOpen ? 'Đóng MV bài hát chủ đề' : 'Mở MV bài hát chủ đề';
  if (musicOpen) {
    stopBackgroundMusic();
    musicDock.hidden = false;
    musicDock.innerHTML = `<div class="music-title"><strong>♫ HỎA TÂM · MV CHỦ ĐỀ</strong><button id="closeMusic" aria-label="Đóng MV">×</button></div><iframe title="MV Hỏa Tâm trên YouTube, bắt đầu từ 0:10" width="100%" height="220" src="https://www.youtube-nocookie.com/embed/bOlQtdf1_Cc?autoplay=1&start=${musicStart}&mute=${soundOn ? 0 : 1}&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><p class="music-tip">Nếu điện thoại chặn tự phát, chạm nút Play ngay trong video.</p><div class="music-footer"><span>Bắt đầu từ 0:10</span><a href="https://www.youtube.com/watch?v=bOlQtdf1_Cc&t=${musicStart}s" target="_blank" rel="noopener noreferrer">Mở bằng YouTube ↗</a></div>`;
  } else {
    musicDock.hidden = true;
    musicDock.innerHTML = '';
    playBackgroundMusic();
  }
}
soundButton.addEventListener('click', toggleMusicDock);
musicDock.addEventListener('click', event => { if (event.target.id === 'closeMusic') toggleMusicDock(); });
document.querySelector('#closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
modal.addEventListener('click', event => {
  if (event.target.id === 'cancelReset') modal.close();
  if (event.target.id === 'confirmReset') { modal.close(); view = 'play'; act('reset'); }
});

Promise.all([fetch('assets/portraits.json').then(r => r.json()), fetch('assets/portrait-frames.json').then(r => r.json())]).then(([photos, frames]) => { portraits = photos; portraitFrames = frames; if (game) render(); }).catch(() => {});
refresh();
setInterval(() => { if (!busy && game && !document.hidden) refresh(); }, 1000);
setInterval(updateLiveValues, 200);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopBackgroundMusic();
  else refresh().then(() => { if (game?.phase === 'playing' && !game.paused && !musicOpen && soundOn) playBackgroundMusic(); });
});
window.addEventListener('pagehide', stopBackgroundMusic);
