# type.sh

A **code typing trainer** built with [Vite](https://vitejs.dev/) and vanilla
JavaScript — no framework. It ships a first-run onboarding flow, an analytics
**dashboard**, and four **game modes**, all themed with
[Catppuccin Mocha](https://github.com/catppuccin/catppuccin).

## Features

### Onboarding (first run)

A full-screen setup overlay shown until `hasCompletedOnboarding` is stored. It
collects and persists to `localStorage`:

- **Name / alias** — text field
- **Save progress** — opt-in toggle for local stat storage
- **Cursor style** — Block (`█`), Line (`|`) or Underline (`_`), previewed live
- **Preferred language** — dropdown built from the snippet manifest

### Dashboard

The hub you land on after onboarding (uses illustrative mock data until you have
played real sessions):

- **Greeting + streak** — “Welcome back, _name_” and a 🔥 day-streak chip
- **WPM over time** — a [Chart.js](https://www.chartjs.org/) line chart (CDN) of
  the last 10 sessions
- **Keyboard heatmap** — a CSS-grid keyboard tinted by where typos concentrate
- **Recent sessions** — a table of date / mode / language / WPM / accuracy

### Game modes

A prominent **Start Coding** button opens a mode picker:

| Mode                 | Timer    | Rules                                            |
| -------------------- | -------- | ------------------------------------------------ |
| **Arena Sprint**     | 1:00 min | Battle for the top spot on the leaderboard.      |
| **Zero Tolerance**   | 1:00 min | One Error = Game Over. No multiple lives.        |
| **Training Grounds** | 15:00 min | Warm up and experiment without pressure.        |
| **Pattern Chaos**    | 1:00 min | The Pinky Gym: master complex syntax and symbols.|

Picking a mode starts the typing interface with a countdown. Timed runs loop in
fresh snippets until the clock runs out; stats accumulate across them.

### Typing engine

- Each character is rendered into its own `<span>`; correct = green,
  incorrect = red, with the selected cursor style.
- A hidden input (autocomplete/autocorrect/spellcheck disabled) captures keys.
- **Auto-indent-skip** — pressing <kbd>Enter</kbd> auto-fills the leading
  whitespace of the next line so the cursor lands on the first visible character.

## Getting started

```bash
npm install
npm run dev        # opens http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # preview the production build locally
```

Deployed automatically to GitHub Pages on every push to `main`
(see `.github/workflows/deploy.yml`).

## How it works

Snippets are data-driven. `public/snippets/snippets.json` is a manifest; each
entry points at a plain-text `.txt` file:

```json
[{ "id": "js-1", "language": "JavaScript", "difficulty": "medium", "file": "js-1.txt" }]
```

The `Pattern` language powers Pattern Chaos with symbol-heavy snippets. To add
content, drop a `.txt` file into `public/snippets/` and add a manifest entry —
no code changes required.

## Project structure

```
type.sh/
├── index.html              # three views (onboarding / dashboard / session) + mode modal
├── vite.config.js          # Vite config (sets /type.sh/ base on GitHub Pages)
├── public/snippets/        # manifest + snippet .txt files
└── src/
    ├── main.js             # view router / app orchestrator
    ├── onboarding.js       # first-run setup flow
    ├── dashboard.js        # greeting, chart, heatmap, recent sessions
    ├── modes.js            # game-mode catalogue + picker UI
    ├── session.js          # timed run controller (timer, looping, results)
    ├── engine.js           # typing engine (render, cursor, stats, indent-skip)
    ├── storage.js          # localStorage: settings, sessions, streak, highscores
    ├── mockData.js         # placeholder dashboard data
    └── style.css           # Catppuccin Mocha theme
```

## Controls

| Key                  | Action                                    |
| -------------------- | ----------------------------------------- |
| any character        | type the next character                   |
| <kbd>Enter</kbd>     | confirm a line break + auto-skip indent   |
| <kbd>Backspace</kbd> | correct a mistake                         |
| <kbd>Esc</kbd>       | leave a session / close the mode picker   |
