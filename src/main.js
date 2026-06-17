import './style.css';
import { TypingEngine } from './engine.js';
import { isOnboardingComplete, getSettings } from './storage.js';
import { initOnboarding } from './onboarding.js';
import { renderDashboard } from './dashboard.js';
import { renderModePicker, getMode } from './modes.js';
import { SessionController } from './session.js';

const BASE = import.meta.env.BASE_URL; // '/' in dev, '/type.sh/' on Pages
const MANIFEST_URL = `${BASE}snippets/snippets.json`;
const SNIPPET_BASE = `${BASE}snippets/`;

const DEFAULT_MODE = 'training'; // relaxed, typing-first landing

const $ = (id) => document.getElementById(id);

const views = {
  onboarding: $('view-onboarding'),
  dashboard: $('view-dashboard'),
  session: $('view-session'),
};

const onboardingEls = {
  form: $('onboarding-form'),
  name: $('ob-name'),
  save: $('ob-save'),
  language: $('ob-language'),
  cursorInputs: document.querySelectorAll('input[name="cursor"]'),
};

const dashEls = {
  greeting: $('dash-greeting'),
  streak: $('dash-streak'),
  chartCanvas: $('wpm-chart'),
  chartNote: $('chart-note'),
  heatmap: $('heatmap'),
  recent: $('recent-body'),
  startBtn: $('start-coding'),
};

const modalEls = { modal: $('mode-modal'), grid: $('mode-grid'), close: $('mode-close') };

const sessionEls = {
  mode: $('sess-mode'),
  lang: $('sess-lang'),
  language: $('sess-language'),
  modesBtn: $('sess-modes'),
  exit: $('sess-exit'),
  wpm: $('sess-wpm'),
  accuracy: $('sess-accuracy'),
  timer: $('sess-timer'),
  progress: $('sess-progress'),
  code: $('code'),
  input: $('hidden-input'),
  focusNote: $('focus-note'),
  overlay: $('overlay'),
  result: $('result'),
};

// --- view routing -----------------------------------------------------------

let currentView = null;

function showView(name) {
  currentView = name;
  for (const [key, el] of Object.entries(views)) {
    el.classList.toggle('active', key === name);
  }
}

function applyCursor(style) {
  document.documentElement.dataset.cursor = style || 'line';
}

// --- snippet loading --------------------------------------------------------

let manifest = [];

async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Could not load snippet manifest (${res.status})`);
  manifest = await res.json();
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Snippet manifest is empty');
  }
}

function selectableLanguages() {
  return [...new Set(manifest.map((s) => s.language))].filter((l) => l !== 'Pattern');
}

async function getSnippet(language) {
  let pool = manifest.filter((s) => s.language === language);
  if (pool.length === 0) pool = manifest;
  const meta = pool[Math.floor(Math.random() * pool.length)];
  const res = await fetch(`${SNIPPET_BASE}${meta.file}`);
  if (!res.ok) throw new Error(`Could not load snippet "${meta.file}" (${res.status})`);
  return res.text();
}

// --- engine + session -------------------------------------------------------

const engine = new TypingEngine({ codeEl: sessionEls.code, inputEl: sessionEls.input });

const session = new SessionController({ engine, getSnippet, onExit: goDashboard, els: sessionEls });

let activeMode = getMode(DEFAULT_MODE);

// --- navigation -------------------------------------------------------------

function startSession(mode, language) {
  activeMode = mode;
  sessionEls.language.value = language;
  showView('session');
  engine.focus(); // focus inside the user-gesture before the async load resolves
  session.start(mode, language);

  // Safety net: if the browser refused auto-focus, surface the click-to-focus
  // hint so keystrokes are never silently dropped.
  setTimeout(() => {
    if (
      currentView === 'session' &&
      document.activeElement !== sessionEls.input &&
      !sessionEls.overlay.classList.contains('visible')
    ) {
      sessionEls.focusNote.classList.add('visible');
      sessionEls.code.classList.add('blurred');
    }
  }, 200);
}

function goDashboard() {
  session.exit();
  renderDashboard(dashEls, { onStart: openModePicker });
  showView('dashboard');
}

function openModePicker() {
  renderModePicker(modalEls, { onPick: startMode, onClose: closeModal });
  modalEls.modal.classList.add('visible');
}

function closeModal() {
  modalEls.modal.classList.remove('visible');
}

function startMode(mode) {
  closeModal();
  const language =
    mode.content === 'pattern' ? 'Pattern' : getSettings().preferredLanguage || 'JavaScript';
  startSession(mode, language);
}

// --- session-view input wiring ---------------------------------------------

function populateLanguageSelect() {
  sessionEls.language.innerHTML = '';
  for (const lang of selectableLanguages()) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    sessionEls.language.appendChild(opt);
  }
}

function setupSessionControls() {
  const refocus = (e) => {
    e.preventDefault();
    engine.focus();
  };
  sessionEls.code.addEventListener('mousedown', refocus);
  sessionEls.focusNote.addEventListener('mousedown', refocus);

  sessionEls.input.addEventListener('blur', () => {
    if (currentView === 'session' && !sessionEls.overlay.classList.contains('visible')) {
      sessionEls.focusNote.classList.add('visible');
      sessionEls.code.classList.add('blurred');
    }
  });
  sessionEls.input.addEventListener('focus', () => {
    sessionEls.focusNote.classList.remove('visible');
    sessionEls.code.classList.remove('blurred');
  });

  sessionEls.language.addEventListener('change', () => {
    // Switching language keeps the active mode but always uses that language.
    startSession(activeMode, sessionEls.language.value);
  });
  sessionEls.modesBtn.addEventListener('click', openModePicker);
  sessionEls.exit.addEventListener('click', goDashboard);
}

function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalEls.modal.classList.contains('visible')) {
      closeModal();
    } else if (currentView === 'session') {
      e.preventDefault();
      goDashboard();
    }
  });
}

// --- bootstrap --------------------------------------------------------------

function startDefaultSession() {
  const lang = getSettings().preferredLanguage || selectableLanguages()[0] || 'JavaScript';
  startSession(getMode(DEFAULT_MODE), lang);
}

async function init() {
  applyCursor(getSettings().cursorStyle);
  setupSessionControls();
  setupShortcuts();

  try {
    await loadManifest();
  } catch (err) {
    console.error(err);
    sessionEls.code.textContent = `⚠ ${err.message}`;
    showView('session');
    return;
  }

  populateLanguageSelect();

  if (!isOnboardingComplete()) {
    initOnboarding(onboardingEls, {
      languages: selectableLanguages(),
      onCursorPreview: applyCursor,
      onComplete: (settings) => {
        applyCursor(settings.cursorStyle);
        startDefaultSession(); // land straight in the typing view
      },
    });
    showView('onboarding');
  } else {
    startDefaultSession();
  }
}

init();
