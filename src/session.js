// Session controller: drives a single typing run on top of the TypingEngine.
//
// codetype-style: one run = one snippet. The timer counts down as a soft cap;
// completing the snippet ends the run with a result. There is no mid-run
// snippet swapping. Zero Tolerance ends on the first mistake.

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
    this.currentText = null;
  }

  /** Begin a run with a freshly picked snippet. */
  async start(mode, language) {
    this.mode = mode;
    this.language = language;
    await this._run(false);
  }

  /** Replay the same snippet. */
  restart() {
    return this._run(true);
  }

  /** Pick a new snippet in the same mode/language. */
  next() {
    return this._run(false);
  }

  async _run(reuse) {
    this._stopTicker();
    this.started = false;
    this.ended = false;
    this.startTime = null;
    this.last = { wpm: 0, accuracy: 100, elapsed: 0 };

    this.engine.onStats = () => this.update();
    this.engine.onFinish = () => this.end('done');
    this.engine.onError = () => {
      if (this.mode.failOnError && !this.ended) this.end('failed');
    };

    this.els.mode.textContent = this.mode.name;
    this.els.lang.textContent = this.language;
    this.els.timer.classList.remove('low');
    this.hideOverlay();

    const text = reuse && this.currentText ? this.currentText : await this.getSnippet(this.language);
    this.currentText = text;
    this.engine.load(text); // resets engine + re-renders + focuses
    this.update();
    this.engine.focus();
  }

  ensureStarted() {
    if (this.started || this.ended) return;
    if (this.engine.startTime !== null) {
      this.started = true;
      this.startTime = performance.now();
      this.ticker = setInterval(() => this.tick(), 100);
    }
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

    const { correct, errors } = this.engine;
    const elapsedSec = this.started
      ? Math.min((performance.now() - this.startTime) / 1000, this.mode.duration)
      : 0;
    const minutes = elapsedSec / 60;
    const wpm = minutes > 0 ? Math.round(correct / 5 / minutes) : 0;
    const keystrokes = correct + errors;
    const accuracy = keystrokes > 0 ? Math.round((correct / keystrokes) * 100) : 100;
    const remaining = this.mode.duration - elapsedSec;

    this.els.wpm.textContent = wpm;
    this.els.accuracy.textContent = `${accuracy}%`;
    this.els.timer.textContent = fmtClock(remaining);
    this.els.timer.classList.toggle('low', remaining <= 10 && this.started);
    this.els.progress.style.width = `${Math.round(this.engine.getStats().progress * 100)}%`;

    this.last = { wpm, accuracy, elapsed: elapsedSec };
  }

  end(reason) {
    if (this.ended) return;
    this.ended = true;
    this._stopTicker();
    this.engine.stop();
    this.update();

    const { wpm, accuracy } = this.last;
    const result = addSession({ mode: this.mode.name, language: this.language, wpm, accuracy });
    this.showResult(reason, wpm, accuracy, result);
  }

  showResult(reason, wpm, accuracy, result) {
    const titles = { done: 'Complete!', time: "Time's up!", failed: 'Game Over' };
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
        <span class="result-stat"><strong>${this.last.elapsed.toFixed(1)}s</strong> time</span>
      </div>
      ${notes.join(' ')}
      <div class="result-actions">
        <button id="result-next" class="btn primary" type="button">Next snippet</button>
        <button id="result-retry" class="btn ghost" type="button">Retry</button>
        <button id="result-dashboard" class="btn ghost" type="button">Dashboard</button>
      </div>
    `;
    this.showOverlay();

    document.getElementById('result-next').onclick = () => this.next();
    document.getElementById('result-retry').onclick = () => this.restart();
    document.getElementById('result-dashboard').onclick = () => this.onExit();
  }

  /** Cleanup when leaving the session view. */
  exit() {
    this._stopTicker();
    this.ended = true;
    this.engine.stop();
    this.hideOverlay();
  }

  _stopTicker() {
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
