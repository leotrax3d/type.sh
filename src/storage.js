// Single source of persistence for type.sh, kept in localStorage (never cookies).
// One namespaced object holds everything:
//
//   {
//     onboardingComplete: boolean,
//     settings: { name, saveProgress, cursorStyle, preferredLanguage },
//     sessions: [ { date, mode, language, wpm, accuracy } ],
//     highscores: { [language]: { wpm, accuracy } },
//     streak:   { count, lastDate }   // lastDate is an ISO yyyy-mm-dd string
//   }

const KEY = 'type.sh:state';

const DEFAULTS = {
  onboardingComplete: false,
  settings: {
    name: '',
    saveProgress: true,
    cursorStyle: 'line', // 'block' | 'line' | 'underline'
    preferredLanguage: 'JavaScript',
  },
  sessions: [],
  highscores: {},
  streak: { count: 0, lastDate: null },
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return structuredClone(DEFAULTS);
    // Merge with defaults so newly added fields are always present.
    return {
      ...structuredClone(DEFAULTS),
      ...raw,
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) },
      streak: { ...DEFAULTS.streak, ...(raw.streak || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode / quota) — fail silently.
  }
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// --- settings / onboarding --------------------------------------------------

export function getSettings() {
  return load().settings;
}

export function isOnboardingComplete() {
  return load().onboardingComplete === true;
}

export function completeOnboarding(settings) {
  const state = load();
  state.settings = { ...state.settings, ...settings };
  state.onboardingComplete = true;
  save(state);
  return state.settings;
}

// --- sessions / streak / highscores ----------------------------------------

export function getSessions() {
  return load().sessions;
}

export function getStreak() {
  return load().streak.count;
}

export function getHighscore(language) {
  return load().highscores[language] || null;
}

/**
 * Persists a finished session (only when the user opted into saving progress),
 * updates the day-streak and per-language highscore.
 * @returns {{ saved: boolean, streak: number, best: boolean }}
 */
export function addSession({ mode, language, wpm, accuracy }) {
  const state = load();

  if (!state.settings.saveProgress) {
    return { saved: false, streak: state.streak.count, best: false };
  }

  state.sessions.push({ date: new Date().toISOString(), mode, language, wpm, accuracy });
  if (state.sessions.length > 50) state.sessions = state.sessions.slice(-50);

  // Day-streak: +1 if last play was yesterday, reset to 1 if there was a gap.
  const today = isoDate();
  if (state.streak.lastDate !== today) {
    const yesterday = isoDate(new Date(Date.now() - 86_400_000));
    state.streak.count = state.streak.lastDate === yesterday ? state.streak.count + 1 : 1;
    state.streak.lastDate = today;
  }

  // Per-language best.
  const prev = state.highscores[language] || { wpm: 0, accuracy: 0 };
  const best = wpm > prev.wpm;
  state.highscores[language] = {
    wpm: Math.max(prev.wpm, wpm),
    accuracy: Math.max(prev.accuracy, accuracy),
  };

  save(state);
  return { saved: true, streak: state.streak.count, best };
}
