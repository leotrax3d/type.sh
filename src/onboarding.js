// First-time onboarding flow. Reads the form fields, persists them via
// `completeOnboarding`, and hands the resulting settings back to the caller.

import { completeOnboarding } from './storage.js';

/**
 * @param {{
 *   form: HTMLFormElement, name: HTMLInputElement, save: HTMLInputElement,
 *   language: HTMLSelectElement, cursorInputs: NodeListOf<HTMLInputElement>
 * }} els
 * @param {{ languages: string[], onCursorPreview: (style:string)=>void,
 *           onComplete: (settings)=>void }} opts
 */
export function initOnboarding(els, { languages, onCursorPreview, onComplete }) {
  // Populate the preferred-language dropdown from the snippet manifest.
  els.language.innerHTML = '';
  for (const lang of languages) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    els.language.appendChild(opt);
  }

  // Live-preview the cursor style as the user picks it.
  for (const input of els.cursorInputs) {
    input.addEventListener('change', () => {
      if (input.checked) onCursorPreview(input.value);
    });
  }

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedCursor = [...els.cursorInputs].find((i) => i.checked);
    const settings = {
      name: els.name.value.trim() || 'Coder',
      saveProgress: els.save.checked,
      cursorStyle: selectedCursor ? selectedCursor.value : 'line',
      preferredLanguage: els.language.value,
    };
    completeOnboarding(settings);
    onComplete(settings);
  });
}
