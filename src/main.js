import './style.css';
import { TypingEngine } from './engine.js';
import { getHighscore, saveResult } from './storage.js';

// import.meta.env.BASE_URL mirrors the Vite `base` option ('/' in dev, '/type.sh/' on Pages).
const MANIFEST_URL = `${import.meta.env.BASE_URL}snippets/snippets.json`;
const SNIPPET_BASE = `${import.meta.env.BASE_URL}snippets/`;

const els = {
  language: document.getElementById('language-select'),
  highscore: document.getElementById('highscore'),
  wpm: document.getElementById('stat-wpm'),
  accuracy: document.getElementById('stat-accuracy'),
  progress: document.getElementById('progress-bar'),
  code: document.getElementById('code'),
  input: document.getElementById('hidden-input'),
  restart: document.getElementById('restart'),
  overlay: document.getElementById('overlay'),
  result: document.getElementById('result'),
  focusNote: document.getElementById('focus-note'),
};

let manifest = [];
let current = null; // { id, language, difficulty, file, text }

const engine = new TypingEngine({
  codeEl: els.code,
  inputEl: els.input,
  onStats: renderStats,
  onFinish: handleFinish,
});

// --- rendering --------------------------------------------------------------

function renderStats({ wpm, accuracy, progress }) {
  els.wpm.textContent = wpm;
  els.accuracy.textContent = `${accuracy}%`;
  els.progress.style.width = `${Math.round(progress * 100)}%`;
}

function renderHighscore(language) {
  const hs = getHighscore(language);
  if (hs) {
    els.highscore.textContent = `Personal Highscore — ${hs.wpm} WPM · ${hs.accuracy}% accuracy`;
    els.highscore.classList.remove('empty');
  } else {
    els.highscore.textContent = `Personal Highscore — no record yet for ${language}`;
    els.highscore.classList.add('empty');
  }
}

function handleFinish(stats) {
  const { language } = current;
  const { improved } = saveResult(language, stats.wpm, stats.accuracy);
  renderHighscore(language);

  const badge =
    improved.wpm || improved.accuracy
      ? '<div class="result-badge">★ New personal best!</div>'
      : '';

  els.result.innerHTML = `
    <h2>nice — snippet complete</h2>
    <div class="result-stats">
      <span class="result-stat"><strong>${stats.wpm}</strong> WPM</span>
      <span class="result-stat"><strong>${stats.accuracy}%</strong> accuracy</span>
    </div>
    ${badge}
    <button id="result-restart" class="btn primary" type="button">Restart · Esc</button>
  `;
  els.overlay.classList.add('visible');
  document.getElementById('result-restart').addEventListener('click', restart);
}

// --- data loading -----------------------------------------------------------

async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Could not load snippet manifest (${res.status})`);
  manifest = await res.json();
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Snippet manifest is empty');
  }
}

function languages() {
  return [...new Set(manifest.map((s) => s.language))];
}

function populateLanguageSelect() {
  els.language.innerHTML = '';
  for (const lang of languages()) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    els.language.appendChild(opt);
  }
}

function pickSnippet(language) {
  const pool = manifest.filter((s) => s.language === language);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function loadSnippet(meta) {
  const res = await fetch(`${SNIPPET_BASE}${meta.file}`);
  if (!res.ok) throw new Error(`Could not load snippet "${meta.file}" (${res.status})`);
  const text = await res.text();
  current = { ...meta, text };
  hideOverlay();
  engine.load(text);
}

async function selectLanguage(language) {
  renderHighscore(language);
  await loadSnippet(pickSnippet(language));
}

function restart() {
  hideOverlay();
  // Re-pick a snippet for the current language so "restart" can serve variety
  // when more than one snippet exists; falls back to the same one otherwise.
  if (current) {
    loadSnippet(pickSnippet(current.language));
  }
}

function hideOverlay() {
  els.overlay.classList.remove('visible');
}

// --- focus + shortcuts ------------------------------------------------------

function setupFocus() {
  // Clicking the code keeps the real (hidden) input focused.
  els.code.addEventListener('mousedown', (e) => {
    e.preventDefault();
    engine.focus();
  });
  els.focusNote.addEventListener('mousedown', (e) => {
    e.preventDefault();
    engine.focus();
  });

  els.input.addEventListener('blur', () => {
    if (!els.overlay.classList.contains('visible')) {
      els.focusNote.classList.add('visible');
      els.code.classList.add('blurred');
    }
  });
  els.input.addEventListener('focus', () => {
    els.focusNote.classList.remove('visible');
    els.code.classList.remove('blurred');
  });
}

function setupShortcuts() {
  els.restart.addEventListener('click', restart);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      restart();
    }
  });
}

// --- bootstrap --------------------------------------------------------------

async function init() {
  setupFocus();
  setupShortcuts();
  try {
    await loadManifest();
    populateLanguageSelect();
    els.language.addEventListener('change', () => selectLanguage(els.language.value));
    await selectLanguage(els.language.value);
  } catch (err) {
    console.error(err);
    els.code.textContent = `⚠ ${err.message}`;
  }
}

init();
