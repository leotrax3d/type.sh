// Persistence of personal best scores, kept per programming language in
// localStorage (never cookies). Stored shape:
//   { "JavaScript": { wpm: 84, accuracy: 98 }, "Kotlin": { ... } }

const STORAGE_KEY = 'type.sh:highscores';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable (e.g. private mode / quota) — fail silently.
  }
}

/**
 * @returns {{wpm: number, accuracy: number} | null}
 */
export function getHighscore(language) {
  const all = readAll();
  return all[language] || null;
}

/**
 * Records a finished run, keeping the best WPM and best accuracy seen so far
 * for the given language.
 * @returns {{best: {wpm:number, accuracy:number}, improved: {wpm:boolean, accuracy:boolean}}}
 */
export function saveResult(language, wpm, accuracy) {
  const all = readAll();
  const current = all[language] || { wpm: 0, accuracy: 0 };

  const improved = {
    wpm: wpm > current.wpm,
    accuracy: accuracy > current.accuracy,
  };
  const best = {
    wpm: Math.max(current.wpm, wpm),
    accuracy: Math.max(current.accuracy, accuracy),
  };

  all[language] = best;
  writeAll(all);
  return { best, improved };
}
