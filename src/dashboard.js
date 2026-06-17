// Dashboard view: greeting + streak, WPM-over-time chart (Chart.js), a CSS-grid
// keyboard heatmap of error hot-spots, and a recent-sessions table.
//
// Uses real saved sessions when available, otherwise realistic mock data so the
// layout is always populated.

import { getSettings, getSessions, getStreak } from './storage.js';
import { MOCK_SESSIONS, MOCK_STREAK, MOCK_KEY_ERRORS } from './mockData.js';

// Catppuccin Mocha colours used by the chart canvas (Chart.js can't read CSS vars).
const C = {
  mauve: '#cba6f7',
  blue: '#89b4fa',
  text: '#cdd6f4',
  overlay: '#6c7086',
  surface: '#313244',
};

const KEYBOARD_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

let chart = null;

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Normalise both real and mock sessions to a single render shape. */
function resolveSessions() {
  const settings = getSettings();
  const real = getSessions();
  if (settings.saveProgress && real.length > 0) {
    return real.map((s) => ({
      label: fmtDate(new Date(s.date)),
      dateText: fmtDate(new Date(s.date)),
      mode: s.mode,
      language: s.language,
      wpm: s.wpm,
      accuracy: s.accuracy,
    }));
  }
  return MOCK_SESSIONS.map((s) => {
    const d = new Date(Date.now() - s.daysAgo * 86_400_000);
    return {
      label: fmtDate(d),
      dateText: s.daysAgo === 0 ? 'Today' : fmtDate(d),
      mode: s.mode,
      language: s.language,
      wpm: s.wpm,
      accuracy: s.accuracy,
    };
  });
}

function resolveStreak() {
  const settings = getSettings();
  const real = getSessions();
  return settings.saveProgress && real.length > 0 ? getStreak() : MOCK_STREAK;
}

export function renderDashboard(els, { onStart }) {
  const settings = getSettings();
  const sessions = resolveSessions();
  const streak = resolveStreak();

  els.greeting.textContent = `Welcome back, ${settings.name || 'Coder'}`;
  els.streak.textContent = `🔥 ${streak} Day Streak`;

  renderChart(els, sessions);
  renderHeatmap(els);
  renderRecent(els, sessions);

  els.startBtn.onclick = onStart;
}

function renderChart(els, sessions) {
  const recent = sessions.slice(-10);
  const labels = recent.map((s) => s.label);
  const data = recent.map((s) => s.wpm);

  if (!globalThis.Chart) {
    els.chartNote.hidden = false;
    return;
  }
  els.chartNote.hidden = true;

  if (chart) chart.destroy();
  chart = new globalThis.Chart(els.chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'WPM',
          data,
          borderColor: C.mauve,
          backgroundColor: 'rgba(203, 166, 247, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: C.blue,
          pointBorderColor: C.blue,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: C.surface },
          ticks: { color: C.overlay, font: { size: 11 } },
        },
        y: {
          grid: { color: C.surface },
          ticks: { color: C.overlay, font: { size: 11 } },
          beginAtZero: true,
        },
      },
    },
  });
}

function heatLevel(value, max) {
  if (max <= 0) return 0;
  return Math.min(4, Math.round((value / max) * 4));
}

function renderHeatmap(els) {
  const max = Math.max(...Object.values(MOCK_KEY_ERRORS));
  els.heatmap.innerHTML = '';

  for (const row of KEYBOARD_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    for (const key of row) {
      const keyEl = document.createElement('div');
      const errors = MOCK_KEY_ERRORS[key] || 0;
      keyEl.className = `kb-key heat-${heatLevel(errors, max)}`;
      keyEl.textContent = key;
      rowEl.appendChild(keyEl);
    }
    els.heatmap.appendChild(rowEl);
  }

  // Space bar row.
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const space = document.createElement('div');
  space.className = `kb-key kb-space heat-${heatLevel(MOCK_KEY_ERRORS[' '] || 0, max)}`;
  space.textContent = 'space';
  spaceRow.appendChild(space);
  els.heatmap.appendChild(spaceRow);
}

function renderRecent(els, sessions) {
  const recent = sessions.slice(-8).reverse();
  els.recent.innerHTML = recent
    .map(
      (s) => `
      <tr>
        <td>${s.dateText}</td>
        <td>${s.mode}</td>
        <td>${s.language}</td>
        <td class="num">${s.wpm}</td>
        <td class="num">${s.accuracy}%</td>
      </tr>`
    )
    .join('');
}
