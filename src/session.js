// Session controller: drives a single timed run on top of the TypingEngine.
//
// The engine handles one snippet at a time; this controller owns the clock,
// loops in fresh snippets when one is completed before time runs out, and
// aggregates stats across them. It also enforces mode rules (e.g. Zero
// Tolerance ends on the first mistake).

import { addSession } from './storage.js';

function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export class SessionController {
  /**
   * @param {{ engine, getSnippet:(lang:string)=>Promise<string>, onExit:()=>void }} deps
   * @param {object} els  session-view DOM references
   */
  constructor({ engine, getSnippet, onExit, els }) {
    this.engine = engine;
    this.getSnippet = getSnippet;
    this.onExit = onExit;
    this.els = els;
    this.ticker = null;
  }

  async start(mode, language) {
    this.stopTicker();
    this.mode = mode;
    this.language = language;
    this.banked = { correct: 0, errors: 0 };
    this.started = false;
    this.ended = false;
    this.startTime = null;
    this.last = { wpm: 0, accuracy: 100 };

    // Wire engine callbacks to this session.
    this.engine.onStats = () => this.update();
    this.engine.onFinish = () => this.handleSnippetDone();
    this.engine.onError = () => this.handleError();

    this.els.mode.textContent = mode.name;
    this.els.lang.textContent = language;
    this.els.timer.classList.remove('low');
    this.hideOverlay();

    await this.loadNext();
    this.update();
    this.engine.focus();
  }

  async loadNext() {
    const text = await this.getSnippet(this.language);
    this.engine.load(text); // resets engine counters + re-renders + focuses
  }

  ensureStarted() {
    if (this.started || this.ended) return;
    // The engine sets its startTime on the first real keystroke.
    if (this.engine.startTime !== null) {
      this.started = true;
      this.startTime = performance.now();
      this.ticker = setInterval(() => this.tick(), 100);
    }
  }

  handleError() {
    if (this.mode.failOnError && !this.ended) this.end('failed');
  }

  async handleSnippetDone() {
    if (this.ended) return;
    // Bank the finished snippet's contribution and serve another.
    this.banked.correct += this.engine.correct;
    this.banked.errors += this.engine.errors;
    await this.loadNext();
    this.engine.focus();
  }

  tick() {
    if (this.ended) return;
    const elapsed = (performance.now() - this.startTime) / 1000;
    if (elapsed >= this.mode.duration) {
      this.end('time');
      return;
    }
    this.update();
  }

  update() {
    this.ensureStarted();

    const totalCorrect = this.banked.correct + this.engine.correct;
    const totalErrors = this.banked.errors + this.engine.errors;
    const elapsedSec = this.started
      ? Math.min((performance.now() - this.startTime) / 1000, this.mode.duration)
      : 0;
    const minutes = elapsedSec / 60;
    const wpm = minutes > 0 ? Math.round(totalCorrect / 5 / minutes) : 0;
    const keystrokes = totalCorrect + totalErrors;
    const accuracy = keystrokes > 0 ? Math.round((totalCorrect / keystrokes) * 100) : 100;
    const remaining = this.mode.duration - elapsedSec;

    this.els.wpm.textContent = wpm;
    this.els.accuracy.textContent = `${accuracy}%`;
    this.els.timer.textContent = fmtClock(remaining);
    this.els.timer.classList.toggle('low', remaining <= 10 && this.started);
    this.els.progress.style.width = `${Math.round(this.engine.getStats().progress * 100)}%`;

    this.last = { wpm, accuracy, totalCorrect, totalErrors };
  }

  end(reason) {
    if (this.ended) return;
    this.ended = true;
    this.stopTicker();
    this.engine.stop();
    this.update();

    const { wpm, accuracy } = this.last;
    const result = addSession({
      mode: this.mode.name,
      language: this.language,
      wpm,
      accuracy,
    });
    this.showResult(reason, wpm, accuracy, result);
  }

  showResult(reason, wpm, accuracy, result) {
    const titles = {
      time: "Time's up!",
      failed: 'Game Over',
    };
    const subtitle =
      reason === 'failed'
        ? 'Zero Tolerance — a single mistake ends the run.'
        : `${this.mode.name} · ${this.language}`;

    const notes = [];
    if (result.best) notes.push('<span class="result-badge">★ New personal best!</span>');
    if (!result.saved) notes.push('<span class="result-note">Progress saving is off</span>');

    this.els.result.innerHTML = `
      <h2>${titles[reason] || 'Done'}</h2>
      <p class="result-sub">${subtitle}</p>
      <div class="result-stats">
        <span class="result-stat"><strong>${wpm}</strong> WPM</span>
        <span class="result-stat"><strong>${accuracy}%</strong> accuracy</span>
      </div>
      ${notes.join(' ')}
      <div class="result-actions">
        <button id="result-retry" class="btn primary" type="button">Retry</button>
        <button id="result-dashboard" class="btn ghost" type="button">Dashboard</button>
      </div>
    `;
    this.showOverlay();

    document.getElementById('result-retry').onclick = () => this.start(this.mode, this.language);
    document.getElementById('result-dashboard').onclick = () => this.onExit();
  }

  /** Cleanup when leaving the session view without finishing. */
  exit() {
    this.stopTicker();
    this.ended = true;
    this.engine.stop();
    this.hideOverlay();
  }

  stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  showOverlay() {
    this.els.overlay.classList.add('visible');
  }

  hideOverlay() {
    this.els.overlay.classList.remove('visible');
  }
}
