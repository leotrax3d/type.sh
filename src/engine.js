// Core typing engine for type.sh.
//
// Responsibilities:
//   - Render a code snippet character-by-character into <span> elements.
//   - Track the cursor, per-character correctness, and live stats (WPM / accuracy).
//   - Auto-indent-skip: when Enter is pressed, the leading whitespace of the
//     next line is filled in automatically so the cursor lands on the first
//     visible code character.
//
// Keystrokes are captured from a hidden <input> via `keydown`, which gives us
// precise control over Enter / Tab / Backspace handling.

const WHITESPACE = new Set([' ', '\t']);

export class TypingEngine {
  constructor({ codeEl, inputEl, onStats, onFinish }) {
    this.codeEl = codeEl;
    this.inputEl = inputEl;
    this.onStats = onStats || (() => {});
    this.onFinish = onFinish || (() => {});

    this.expected = '';
    this.spans = [];
    this.autoFilled = new Set(); // indices filled automatically by indent-skip
    this.index = 0;
    this.correct = 0; // chars the user typed correctly (excludes auto-filled)
    this.errors = 0; // total wrong keystrokes
    this.startTime = null;
    this.finished = true;
    this.ticker = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this.inputEl.addEventListener('keydown', this._onKeyDown);
  }

  /** Load a new snippet, render it, and reset all progress. */
  load(text) {
    // Normalise line endings; trim trailing whitespace so the snippet always
    // ends on a real character (clean completion detection).
    this.expected = text.replace(/\r\n/g, '\n').replace(/[ \t\n]+$/g, '');
    this._render();
    this.reset();
  }

  /** Reset progress for the currently loaded snippet. */
  reset() {
    this.index = 0;
    this.correct = 0;
    this.errors = 0;
    this.startTime = null;
    this.finished = false;
    this.autoFilled.clear();
    this._stopTicker();

    for (const span of this.spans) {
      span.className = span.dataset.base;
    }
    this.codeEl.scrollTop = 0;

    // Skip indentation at the very start of the snippet (rare but possible).
    this._skipIndent();
    this._updateCursor();
    this._emitStats();
    this.focus();
  }

  destroy() {
    this.inputEl.removeEventListener('keydown', this._onKeyDown);
    this._stopTicker();
  }

  focus() {
    this.inputEl.focus({ preventScroll: true });
  }

  // --- rendering ------------------------------------------------------------

  _render() {
    this.codeEl.textContent = '';
    this.spans = [];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < this.expected.length; i++) {
      const ch = this.expected[i];
      const span = document.createElement('span');
      let base = 'char';

      if (ch === '\n') {
        base = 'char newline';
        span.textContent = '↵\n'; // ↵ marker, then the actual line break
      } else if (ch === ' ') {
        base = 'char space';
        span.textContent = ' ';
      } else if (ch === '\t') {
        base = 'char tab';
        span.textContent = '\t';
      } else {
        span.textContent = ch;
      }

      span.className = base;
      span.dataset.base = base;
      this.spans.push(span);
      frag.appendChild(span);
    }

    this.codeEl.appendChild(frag);
  }

  // --- input handling -------------------------------------------------------

  _onKeyDown(e) {
    // Let browser / OS shortcuts pass through untouched.
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const { key } = e;

    if (key === 'Backspace') {
      e.preventDefault();
      this._backspace();
    } else if (key === 'Enter') {
      e.preventDefault();
      this._typeStructural('\n');
    } else if (key === 'Tab') {
      e.preventDefault(); // keep focus inside the trainer
      this._typeStructural('\t');
    } else if (key.length === 1) {
      e.preventDefault();
      this._typeChar(key);
    }
  }

  _begin() {
    if (this.startTime === null) {
      this.startTime = performance.now();
      this._startTicker();
    }
  }

  _typeChar(key) {
    if (this.finished || this.index >= this.expected.length) return;

    const expectedChar = this.expected[this.index];
    // Newlines must be produced with Enter — ignore printable keys here.
    if (expectedChar === '\n') return;

    this._begin();
    if (key === expectedChar) {
      this._mark(this.index, 'correct');
      this.correct++;
    } else {
      this._mark(this.index, 'incorrect');
      this.errors++;
    }
    this.index++;
    this._afterAdvance();
  }

  _typeStructural(char) {
    if (this.finished || this.index >= this.expected.length) return;

    // Enter / Tab only do something when that character is actually expected.
    if (this.expected[this.index] !== char) return;

    this._begin();
    this._mark(this.index, 'correct');
    this.correct++;
    this.index++;
    if (char === '\n') this._skipIndent();
    this._afterAdvance();
  }

  /** Auto-fill the leading whitespace (indentation) of the current line. */
  _skipIndent() {
    while (
      this.index < this.expected.length &&
      WHITESPACE.has(this.expected[this.index])
    ) {
      this._mark(this.index, 'correct');
      this.autoFilled.add(this.index);
      this.index++;
    }
  }

  _backspace() {
    if (this.finished || this.index === 0) return;

    let i = this.index - 1;

    // Step back over any auto-filled indentation (it was never typed).
    while (i >= 0 && this.autoFilled.has(i)) {
      this._clear(i);
      this.autoFilled.delete(i);
      i--;
    }

    if (i < 0) {
      this.index = 0;
      this._skipIndent();
      this._updateCursor();
      this._emitStats();
      return;
    }

    // Undo the stats contribution of the character we are erasing.
    if (this.spans[i].classList.contains('correct')) {
      this.correct = Math.max(0, this.correct - 1);
    }
    this._clear(i);
    this.index = i;
    this._updateCursor();
    this._emitStats();
  }

  _afterAdvance() {
    this._updateCursor();
    this._emitStats();
    if (this.index >= this.expected.length) this._finish();
  }

  // --- DOM helpers ----------------------------------------------------------

  _mark(i, status) {
    const span = this.spans[i];
    span.className = `${span.dataset.base} ${status}`;
  }

  _clear(i) {
    const span = this.spans[i];
    span.className = span.dataset.base;
  }

  _updateCursor() {
    if (this._cursorSpan) this._cursorSpan.classList.remove('current');
    this._cursorSpan = this.spans[this.index] || null;
    if (this._cursorSpan) {
      this._cursorSpan.classList.add('current');
      this._scrollIntoView(this._cursorSpan);
    }
  }

  _scrollIntoView(span) {
    const viewTop = this.codeEl.scrollTop;
    const viewBottom = viewTop + this.codeEl.clientHeight;
    const top = span.offsetTop;
    const bottom = top + span.offsetHeight;
    const pad = 24;
    if (top < viewTop) {
      this.codeEl.scrollTop = Math.max(0, top - pad);
    } else if (bottom > viewBottom) {
      this.codeEl.scrollTop = bottom - this.codeEl.clientHeight + pad;
    }
  }

  // --- stats ----------------------------------------------------------------

  getStats() {
    const elapsedMs = this.startTime !== null ? performance.now() - this.startTime : 0;
    const minutes = elapsedMs / 60000;
    const wpm = minutes > 0 ? Math.round(this.correct / 5 / minutes) : 0;
    const keystrokes = this.correct + this.errors;
    const accuracy = keystrokes > 0 ? Math.round((this.correct / keystrokes) * 100) : 100;
    const progress = this.expected.length ? this.index / this.expected.length : 0;
    return { wpm, accuracy, progress, errors: this.errors, elapsedMs };
  }

  _emitStats() {
    this.onStats(this.getStats());
  }

  _startTicker() {
    this._stopTicker();
    // Keep WPM live even while the user pauses between keystrokes.
    this.ticker = setInterval(() => this._emitStats(), 200);
  }

  _stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  _finish() {
    this.finished = true;
    this._stopTicker();
    if (this._cursorSpan) {
      this._cursorSpan.classList.remove('current');
      this._cursorSpan = null;
    }
    this.onFinish(this.getStats());
  }
}
