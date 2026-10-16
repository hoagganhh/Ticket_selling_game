import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(root, 'tools', '.test-'));
process.env.GAME_SAVE_FILE = path.join(temp, 'save.json');
try {
  const { getPublicState } = await import('../backend/game.js?frontend');
  const state = getPublicState();
  const elements = new Map();
  const documentListeners = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: '', textContent: '', hidden: false, dataset: {}, style: {}, paused: true, readyState: 4,
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {}, closest() { return null; }, setAttribute() {}, getAttribute() { return 'assets/hoa-tam-background.wav'; },
      getBoundingClientRect() { return { left: 12, top: 240, width: 100, height: 70 }; },
      play() { this.paused = false; this.playCalls = (this.playCalls || 0) + 1; return Promise.resolve(); },
      pause() { this.paused = true; }, close() {}, showModal() {}
    });
    return elements.get(selector);
  };
  let engines = 0;
  let tones = 0;
  let flightAnimation;
  const connection = () => ({ connect() { return this; }, disconnect() {}, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, getFloatTimeDomainData(a) { a.fill(.1); } });
  class AudioEngine {
    constructor() { engines++; this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 17 }); }
    createGain() { return connection(); }
    createOscillator() { tones++; return { ...connection(), frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {} }; }
    createAnalyser() { return connection(); }
    createBufferSource() { return { ...connection(), start() {}, stop() {} }; }
  }
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => [], addEventListener(name, handler) { documentListeners.set(name, handler); }, hidden: false, body: { ...element('body'), append() {} }, createElement: () => ({ style: {}, remove() {}, animate(keyframes, options) { flightAnimation = { keyframes, options, markup: this.innerHTML }; return { finished: Promise.resolve() }; } }) },
    window: { AudioContext: AudioEngine, innerWidth: 390, innerHeight: 844, scrollTo() {}, addEventListener() {} },
    navigator: { userAgent: 'iPhone Safari', platform: 'iPhone', maxTouchPoints: 5 },
    fetch: async url => ({ ok: true, json: async () => url === '/api/state' ? structuredClone(state) : JSON.parse(fs.readFileSync(path.join(root, 'frontend', url))), arrayBuffer: async () => new ArrayBuffer(4) }),
    setInterval() {}, setTimeout() {}, clearTimeout() {}, console, Blob, structuredClone, fixture: state
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  for (const view of ['play', 'map', 'artists', 'feedback', 'records', 'staff', 'inventory']) {
    vm.runInContext(`view = '${view}'; render();`, context);
    assert.ok(element('#app').innerHTML.length > 100, `${view} rendered`);
  }
  vm.runInContext("view = 'map'; render();", context);
  assert.equal((element('#app').innerHTML.match(/class="map-price-card map-ticket/g) || []).length, 16);
  vm.runInContext("view = 'artists'; artistArt = 'photo'; render();", context);
  assert.match(element('#app').innerHTML, /hosts\/mc-tran-ngoc-full.svg/);
  assert.equal((element('#app').innerHTML.match(/class="portrait-photo"/g) || []).length, 0);
  assert.equal((element('#app').innerHTML.match(/mystery-card locked/g) || []).length, 34);
  assert.doesNotMatch(element('#app').innerHTML, /src="assets\/chibi\/01.svg"/);
  vm.runInContext("game.pendingReveals = 1; render();", context);
  assert.match(element('#app').innerHTML, /data-action="unlockArtist" data-slot="1"/);
  assert.match(element('#app').innerHTML, /CHẠM ĐỂ MỞ/);
  vm.runInContext("game.collectedArtists = [1]; game.artistSlots = {1:1}; game.pendingReveals = 0; game.unlockedArtists = 1; render();", context);
  assert.equal((element('#app').innerHTML.match(/class="portrait-photo"/g) || []).length, 1);
  assert.equal((element('#app').innerHTML.match(/mystery-card locked/g) || []).length, 33);
  assert.doesNotMatch(element('#app').innerHTML, /Tải avatar|Tải chibi|collection-downloads/);
  vm.runInContext("game.collectedArtists = Array.from({length:34}, (_,i) => i+1); game.artistSlots = Object.fromEntries(game.collectedArtists.map(id => [id,id])); game.gaiConBadge = true; render();", context);
  assert.match(element('#app').innerHTML, /class="gai-con-logo"/);
  assert.equal((element('#app').innerHTML.match(/mystery-card locked/g) || []).length, 0);
  vm.runInContext("game.phase = 'playing'; game.queue = [{id:1,artistId:1,zoneId:'hoa-tam',qty:2,patience:80,name:'Khách thử',scanned:false,kind:'normal'}]; game.selectedCustomerId = 1; view = 'play'; render();", context);
  assert.equal((element('#app').innerHTML.match(/class="ticket-tile/g) || []).length, 16);
  assert.match(element('#app').innerHTML, /2 vé Hỏa Tâm/);
  assert.match(element('#app').innerHTML, /data-game-clock/);
  assert.match(element('#app').innerHTML, /data-real-countdown/);
  assert.match(element('#app').innerHTML, /class="compact-reputation/);
  assert.match(element('#app').innerHTML, /UY TÍN/);
  vm.runInContext('game.secondsLeft = 120; game.gameSecondsElapsed = 900; lastSnapshotAt = Date.now() - 3000; updateLiveValues();', context);
  assert.equal(element('[data-real-countdown]').textContent, '01:57');
  assert.equal(element('[data-game-clock]').textContent, '18:15:15');
  vm.runInContext('game.paused = true; updateLiveValues();', context);
  assert.equal(element('[data-real-countdown]').textContent, '02:00');
  vm.runInContext("view = 'inventory'; render();", context);
  assert.equal((element('#app').innerHTML.match(/class="merch-card/g) || []).length, 3);
  assert.equal((element('#app').innerHTML.match(/class="stock-card/g) || []).length, 16);
  vm.runInContext("game.paused = true; view = 'play'; render();", context);
  assert.match(element('#app').innerHTML, /data-action="endDay"/);
  assert.match(element('#app').innerHTML, /Kết thúc ngày bán/);
  vm.runInContext("game.phase = 'gameover'; view = 'inventory'; render();", context);
  assert.equal(element('.bottom-nav').hidden, true);
  assert.equal(element('#pauseButton').hidden, true);
  assert.match(element('#app').innerHTML, /Uy tín đã về 0/);
  assert.match(element('#app').innerHTML, /data-action="reset"/);
  vm.runInContext("game.paused = false; game.exited = false; game.phase = 'playing'; game.reputation = 49; view = 'play'; render();", context);
  assert.match(element('#app').innerHTML, /reputation-warning/);
  assert.match(element('#app').innerHTML, /100.000đ mỗi 10s/);
  await vm.runInContext('playBackgroundMusic()', context);
  assert.equal(engines, 0, 'Older iOS uses native media playback');
  assert.equal(element('#backgroundMusic').paused, false);
  vm.runInContext("stopBackgroundMusic(); navigator.audioSession = {};", context);
  await vm.runInContext('playBackgroundMusic()', context);
  assert.equal(context.navigator.audioSession.type, 'playback');
  assert.equal(engines, 1);
  assert.equal(element('#audioStatus').dataset.engine, 'webaudio');
  vm.runInContext('stopBackgroundMusic();', context);
  assert.equal(element('#audioStatus').dataset.state, 'stopped');
  vm.runInContext("beep('click'); beep('handoff');", context);
  assert.equal(element('#sfxClick').playCalls, 1, 'button sound uses generated WAV on Safari');
  assert.equal(element('#sfxHandoff').playCalls, 1, 'ticket handoff sound uses generated WAV');
  for (const sound of ['click', 'handoff', 'success', 'bad']) {
    assert.equal(fs.readFileSync(path.join(root, 'frontend/assets/sfx', `${sound}.wav`)).toString('ascii', 0, 4), 'RIFF');
  }
  vm.runInContext("game.phase = 'playing'; game.paused = false;", context);
  context.document.hidden = true;
  documentListeners.get('visibilitychange')();
  assert.equal(vm.runInContext('game.paused', context), false, 'switching apps does not pause the shift');
  vm.runInContext("animateTicket({zoneName:'Hỏa Tâm',qty:2,amount:6000000,artistId:1}, {left:20,top:250,width:75,height:60}, {left:40,top:140,width:70,height:100});", context);
  assert.equal(flightAnimation.options.duration, 3800);
  assert.ok(flightAnimation.keyframes.some(frame => frame.offset === .66 && frame.opacity === 1));
  assert.match(flightAnimation.markup, /3\.000\.000đ \/ vé/);
  assert.match(flightAnimation.markup, /2 vé · 6\.000\.000đ tổng cộng/);
  vm.runInContext("openModal('settings')", context);
  assert.match(element('#modalContent').innerHTML, /Lưu tiến trình ngay/);
  assert.match(element('#modalContent').innerHTML, /Đăng nhập/);
  console.log('PASS: hidden card choices without downloads, 34-artist badge, reputation HUD, live countdown, ticket flight, settings, inventory and iOS WAV effects.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
