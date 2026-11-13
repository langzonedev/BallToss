import {
  catchEarly, catchLate, gradeCatch, isSweet, makeFlight, powerAt, sweetStart, sweetEnd,
} from './physics.mjs';
import { createScene } from './scene.mjs';
import { createSound } from './sound.mjs?v=2';

const byId = (id) => document.getElementById(id);
const arena = byId('arena');
const control = byId('control');
const intro = byId('intro');
const result = byId('result');
const feedback = byId('feedback');
const cue = byId('cue');
const fill = byId('fill');
const meter = byId('meter');
const soundButton = byId('sound');
const announcement = byId('announcement');
const scene = createScene(byId('scene'));
const sound = createSound();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const time = () => performance.now() / 1000;
const displayNumber = (number) => String(number).padStart(2, '0');
const store = {
  get(key) {
    try { return localStorage.getItem('balltoss.' + key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem('balltoss.' + key, value); } catch { /* Storage is optional. */ }
  },
};

let score = 0;
let best = Math.max(0, Number(store.get('best')) || 0);
let combo = 0;
let muted = store.get('muted') === 'true';
let phase = 'ready';
let owner = null;
let flight;
let thrownAt = 0;
let pressedAt = 0;
let hiddenAt = null;
let retryAt = 0;
let effect = null;
let feedbackUntil = 0;
let readyUntil = 0;
let missedEarly = false;
let renderedCue = '';

meter.style.setProperty('--sweet-start', sweetStart * 100 + '%');
meter.style.setProperty('--sweet-width', (sweetEnd - sweetStart) * 100 + '%');
byId('best').textContent = displayNumber(best);

function setPhase(next) {
  phase = next;
  arena.dataset.phase = next;
}

function setMute(value) {
  muted = value;
  sound.setMuted(value);
  soundButton.setAttribute('aria-pressed', String(value));
  soundButton.setAttribute('aria-label', value ? 'Unmute sound' : 'Mute sound');
}

setMute(muted);
soundButton.addEventListener('click', () => {
  setMute(!muted);
  store.set('muted', muted);
  sound.unlock();
});

function updateScore() {
  if (score > best) {
    best = score;
    store.set('best', best);
    byId('best').textContent = displayNumber(best);
  }
  byId('score').textContent = displayNumber(score);
}

function showFeedback(text, now, duration) {
  feedback.textContent = text;
  feedbackUntil = now + duration;
}

function begin(input, now) {
  sound.unlock();
  if (phase === 'flight' || phase === 'window') {
    tryCatch(now);
    return;
  }
  if (phase === 'over') {
    if (now < retryAt) return;
    result.hidden = true;
    delete arena.dataset.impact;
    score = 0;
    combo = 0;
    effect = null;
    updateScore();
    announcement.textContent = 'New run.';
  }
  if (phase === 'charging') return;
  intro.hidden = true;
  owner = input;
  pressedAt = now;
  setPhase('charging');
}

function release(input, now) {
  if (phase !== 'charging' || owner !== input) return;
  owner = null;
  const power = powerAt(now - pressedAt);
  flight = { ...makeFlight(power), sweet: isSweet(power) };
  thrownAt = now;
  missedEarly = false;
  feedback.textContent = '';
  setPhase('flight');
  sound.play('toss');
}

function lose(type, now) {
  const roof = type === 'roof';
  effect = { type, at: now };
  retryAt = now + .34;
  arena.dataset.impact = type;
  setPhase('over');
  feedback.textContent = '';
  byId('reason').textContent = roof ? 'Ceiling bonk!' : 'Oof. Right in the face.';
  byId('tip').textContent = roof ? 'Release a little sooner next time.' : 'Tap as the ball reaches your hand.';
  result.hidden = false;
  announcement.textContent = byId('reason').textContent + ' Catches ' + score + '. Hold to try again.';
  sound.play(type);
}

function advanceFlight(now) {
  const elapsed = now - thrownAt;
  if (elapsed >= flight.roofAt) {
    lose('roof', now);
  } else if (elapsed >= flight.faceAt) {
    lose('face', now);
  } else {
    const offset = elapsed - flight.catchAt;
    const next = offset >= -catchEarly && offset <= catchLate ? 'window' : 'flight';
    if (phase !== next) setPhase(next);
  }
}

function tryCatch(now) {
  advanceFlight(now);
  if (phase === 'over') return;
  const elapsed = now - thrownAt;
  const grade = gradeCatch(flight, elapsed);
  if (!grade) {
    if (!missedEarly && elapsed < flight.catchAt) {
      missedEarly = true;
      showFeedback('Wait for it…', now, .33);
      sound.play('early');
    }
    return;
  }
  const cleanCombo = grade === 'perfect' && flight.sweet;
  combo = cleanCombo ? combo + 1 : 0;
  score++;
  updateScore();
  const label = cleanCombo ? (combo > 1 ? 'Perfect combo ×' + combo : 'Perfect combo!')
    : grade === 'perfect' ? 'Perfect catch' : 'Caught!';
  showFeedback(label, now, .78);
  announcement.textContent = label + ' Catches ' + score + '.';
  effect = { type: cleanCombo ? 'combo' : grade, at: now };
  readyUntil = now + .17;
  sound.play(effect.type, combo);
  setPhase('ready');
}

function cancelCharge() {
  if (phase !== 'charging') return;
  owner = null;
  setPhase('ready');
}

control.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  control.focus({ preventScroll: true });
  control.setPointerCapture(event.pointerId);
  begin(event.pointerId, time());
});
control.addEventListener('pointerup', (event) => release(event.pointerId, time()));
for (const type of ['pointercancel', 'lostpointercapture']) {
  control.addEventListener(type, (event) => {
    if (owner === event.pointerId) cancelCharge();
  });
}
control.addEventListener('contextmenu', (event) => event.preventDefault());

// Keyboard users can play immediately or tab to the playfield. Other buttons retain native activation.
const playKey = (event) => event.code === 'Space' || (event.key === 'Enter' && event.target === control);
document.addEventListener('keydown', (event) => {
  if (!playKey(event) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target !== control && event.target !== document.body) return;
  event.preventDefault();
  if (!event.repeat) begin(event.code, time());
});
document.addEventListener('keyup', (event) => {
  if (owner !== event.code) return;
  event.preventDefault();
  release(event.code, time());
});
control.addEventListener('click', (event) => {
  if (event.detail !== 0) return;
  if (owner === 'activation') release(owner, time());
  else begin('activation', time());
});
window.addEventListener('blur', cancelCharge);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = time();
    cancelCharge();
  } else if (hiddenAt !== null) {
    if (phase === 'flight' || phase === 'window') thrownAt += time() - hiddenAt;
    hiddenAt = null;
  }
});

new ResizeObserver(scene.resize).observe(arena);

function frame() {
  const now = time();
  if (hiddenAt !== null) {
    requestAnimationFrame(frame);
    return;
  }
  if (phase === 'flight' || phase === 'window') advanceFlight(now);
  if (feedback.textContent && now >= feedbackUntil) feedback.textContent = '';

  let power = 0;
  let elapsed = 0;
  let heightInAir = 0;
  let sweet = false;
  let roof = false;
  let nextCue = 'Hold to charge';
  if (phase === 'charging') {
    power = powerAt(now - pressedAt);
    const prediction = makeFlight(power);
    heightInAir = prediction.peak;
    sweet = isSweet(power);
    roof = Number.isFinite(prediction.roofAt);
    arena.dataset.sweet = String(sweet);
    arena.dataset.hot = String(roof);
    fill.style.transform = 'scaleX(' + power + ')';
    nextCue = sweet ? 'Release now' : roof ? 'Ceiling risk' : 'Release to toss';
  } else if (phase === 'flight' || phase === 'window') {
    elapsed = now - thrownAt;
    heightInAir = flight.heightAt(elapsed);
    nextCue = phase === 'window' ? 'Catch now'
      : elapsed > flight.catchAt ? 'Too late' : elapsed < flight.apex ? 'Watch the ball' : 'Get ready';
  } else if (phase === 'over') {
    nextCue = 'Hold to try again';
  } else if (now < readyUntil) {
    nextCue = 'Nice catch';
  }
  if (renderedCue !== nextCue) {
    cue.textContent = nextCue;
    renderedCue = nextCue;
  }
  scene.draw({ phase, power, heightInAir, elapsed, effect, now, reduce: reducedMotion.matches, sweet, roof });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
