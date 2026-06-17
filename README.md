# type.sh

A minimal **code typing trainer** built with [Vite](https://vitejs.dev/) and
vanilla JavaScript — no framework. Practice typing real code in **JavaScript**,
**Kotlin** and **C++**, with live WPM/accuracy and per-language personal bests.
Themed with [Catppuccin Mocha](https://github.com/catppuccin/catppuccin).

## Features

- **Catppuccin Mocha** UI in pure CSS — dark base, pastel accents for correct
  (green) / incorrect (red) characters and a blinking caret.
- **Language picker** (JavaScript, Kotlin, C++) in the header.
- **Live WPM & accuracy** counters plus a progress bar.
- **Auto-indent-skip** — pressing <kbd>Enter</kbd> automatically skips the
  leading whitespace of the next line and drops the cursor on the first visible
  character, just like editors auto-indent.
- **Per-language personal highscores** persisted in `localStorage` (no cookies),
  shown under the language dropdown.
- Hidden input field for keystroke capture (autocomplete/spellcheck disabled).

## Getting started

```bash
# 1. install dependencies
npm install

# 2. start the dev server (opens http://localhost:5173)
npm run dev
```

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # preview the production build locally
```

## How it works

Snippets are data-driven. `public/snippets/snippets.json` is a manifest that
lists every snippet; each entry points at a plain-text `.txt` file:

```json
[{ "id": "js-1", "language": "JavaScript", "difficulty": "medium", "file": "js-1.txt" }]
```

The app `fetch()`es the manifest at startup, builds the language dropdown from
it, then `fetch()`es the chosen snippet file on demand. To add a snippet, drop a
new `.txt` file into `public/snippets/` and add an entry to the manifest — no
code changes required.

## Project structure

```
type.sh/
├── index.html              # markup + hidden input
├── vite.config.js          # Vite configuration
├── public/
│   └── snippets/
│       ├── snippets.json   # manifest (source of truth)
│       ├── js-1.txt
│       ├── kt-1.txt
│       └── cpp-1.txt
└── src/
    ├── main.js             # app wiring: fetch, UI, highscores
    ├── engine.js           # typing engine (render, cursor, stats, indent-skip)
    ├── storage.js          # localStorage highscores
    └── style.css           # Catppuccin Mocha theme
```

## Controls

| Key                  | Action                                    |
| -------------------- | ----------------------------------------- |
| any character        | type the next character                   |
| <kbd>Enter</kbd>     | confirm a line break + auto-skip indent   |
| <kbd>Backspace</kbd> | correct a mistake                         |
| <kbd>Esc</kbd>       | restart the current language              |
