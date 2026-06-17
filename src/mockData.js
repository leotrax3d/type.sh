// Realistic-looking placeholder data so the dashboard layout is fully populated
// before the user has accumulated real sessions. The dashboard falls back to
// these whenever there is no saved history.

// Oldest → newest. `daysAgo` is resolved to a real date label at render time so
// the chart always looks current. WPM trends gently upward with noise.
export const MOCK_SESSIONS = [
  { daysAgo: 11, mode: 'Training Grounds', language: 'JavaScript', wpm: 58, accuracy: 94 },
  { daysAgo: 10, mode: 'Arena Sprint', language: 'JavaScript', wpm: 61, accuracy: 95 },
  { daysAgo: 9, mode: 'Arena Sprint', language: 'C++', wpm: 57, accuracy: 92 },
  { daysAgo: 8, mode: 'Zero Tolerance', language: 'Kotlin', wpm: 64, accuracy: 97 },
  { daysAgo: 6, mode: 'Pattern Chaos', language: 'Pattern', wpm: 49, accuracy: 90 },
  { daysAgo: 5, mode: 'Arena Sprint', language: 'JavaScript', wpm: 68, accuracy: 96 },
  { daysAgo: 4, mode: 'Training Grounds', language: 'C++', wpm: 71, accuracy: 95 },
  { daysAgo: 3, mode: 'Arena Sprint', language: 'Kotlin', wpm: 73, accuracy: 98 },
  { daysAgo: 2, mode: 'Zero Tolerance', language: 'JavaScript', wpm: 70, accuracy: 99 },
  { daysAgo: 1, mode: 'Arena Sprint', language: 'JavaScript', wpm: 76, accuracy: 97 },
  { daysAgo: 0, mode: 'Pattern Chaos', language: 'Pattern', wpm: 62, accuracy: 93 },
];

export const MOCK_STREAK = 3;

// Per-key error counts (relative scale). Pinky-reach keys and symbols are
// intentionally "hotter" to mimic where typos concentrate.
export const MOCK_KEY_ERRORS = {
  '`': 4, '1': 3, '2': 3, '3': 4, '4': 5, '5': 5, '6': 6, '7': 7, '8': 8, '9': 7, '0': 6, '-': 8, '=': 9,
  q: 9, w: 4, e: 2, r: 3, t: 3, y: 5, u: 4, i: 3, o: 4, p: 9, '[': 8, ']': 9, '\\': 10,
  a: 3, s: 2, d: 2, f: 1, g: 3, h: 3, j: 2, k: 4, l: 4, ';': 8, "'": 9,
  z: 8, x: 6, c: 3, v: 3, b: 4, n: 3, m: 4, ',': 5, '.': 5, '/': 8,
  ' ': 2,
};
