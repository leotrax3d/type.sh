// Game-mode catalogue and the mode-picker overlay.
//
// `content`:    'language' → use the user's preferred language snippets,
//               'pattern'  → use the symbol-heavy Pattern Chaos snippets.
// `failOnError`: a single mistake ends the run (Zero Tolerance).

export const MODES = [
  {
    id: 'arena',
    name: 'Arena Sprint',
    durationLabel: '1:00 Min',
    duration: 60,
    description: 'Battle for the top spot on the leaderboard.',
    content: 'language',
    failOnError: false,
    icon: '🏆',
  },
  {
    id: 'zero',
    name: 'Zero Tolerance',
    durationLabel: '1:00 Min',
    duration: 60,
    description: 'One Error = Game Over. No multiple lives.',
    content: 'language',
    failOnError: true,
    icon: '💥',
  },
  {
    id: 'training',
    name: 'Training Grounds',
    durationLabel: '15:00 Min',
    duration: 15 * 60,
    description: 'Warm up and experiment without pressure.',
    content: 'language',
    failOnError: false,
    icon: '🌱',
  },
  {
    id: 'chaos',
    name: 'Pattern Chaos',
    durationLabel: '1:00 Min',
    duration: 60,
    description: 'The Pinky Gym: Master complex syntax and symbols.',
    content: 'pattern',
    failOnError: false,
    icon: '🌀',
  },
];

export function getMode(id) {
  return MODES.find((m) => m.id === id) || null;
}

/**
 * Render the mode-selection cards into the modal.
 * @param {{ grid: HTMLElement, modal: HTMLElement, close: HTMLElement }} els
 * @param {{ onPick: (mode) => void, onClose: () => void }} handlers
 */
export function renderModePicker(els, { onPick, onClose }) {
  els.grid.innerHTML = '';
  for (const mode of MODES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `mode-card${mode.failOnError ? ' danger' : ''}`;
    card.innerHTML = `
      <span class="mode-icon" aria-hidden="true">${mode.icon}</span>
      <span class="mode-head">
        <span class="mode-name">${mode.name}</span>
        <span class="mode-time">${mode.durationLabel}</span>
      </span>
      <span class="mode-desc">${mode.description}</span>
    `;
    card.addEventListener('click', () => onPick(mode));
    els.grid.appendChild(card);
  }

  els.close.onclick = onClose;
  // Click on the backdrop (but not the dialog) closes the picker.
  els.modal.onclick = (e) => {
    if (e.target === els.modal) onClose();
  };
}
