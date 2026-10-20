# KeyTurn: Your Personal Memory Edition

Read → Type → Recall → Review → Remember.

A browser-first reading and memory-practice app. Read a source passage, type it into your own Memory Edition
(correct letters turn into permanent ink), answer recall questions, and get an Echo Review on words you struggled
with. Progress and imported-book data are stored in this browser. The core practice flow works offline after its
assets are cached; optional PDF extraction and Rakhu AI features have separate network requirements.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build
```

Open the built app with `npm run preview` (module scripts do not load from `file://`).

## Activity dashboard

- Open **Activity dashboard** from the app header to review typing speed, keystroke accuracy, active typing time, mistakes/corrections, recall performance, Echo reviews, page completion, and page-by-page typing progress.
- Visit history is stored locally in this browser (up to the latest 365 app opens) and visualized for the last seven days. It is a browser visit count, not an account login count.
- KeyTurn currently has no account system or server-side analytics. Progress and visit history are local to this browser and are removed if its site storage is cleared.

## Import a PDF and use Rakhu

- Upload a text-based PDF from the opening cover. Text extraction happens in the browser; the PDF file itself is not uploaded to the AI service. Scanned/image-only PDFs are not OCR'd.
- Local recall questions remain available without AI. PDF.js is loaded on demand from a CDN, so the first PDF import needs an internet connection.
- Rakhu is the optional in-book assistant. When you submit a chat question, the current passage and recent chat context are sent to the Gemini API. AI enhancement for imported-book questions is a separate opt-in; only extracted passage text is sent, not the original PDF.
- To enable server-side AI endpoints on Vercel, set `GEMINI_API_KEY` in the project's environment variables. Never add the key to client-side code or commit it. Without the key or a reachable model, local practice and local questions should remain usable.
- Chat history and the selected custom book are stored in browser `localStorage`; they are not synced between devices.

## Demo script

1. **Open the demo book**, then type the first passage. Make a typo inside "photosynthesis" and fix it with Backspace.
2. Finish the page: success state, page turn, then the recall question.
3. Answer it. The feedback announces an **Echo Review** on the word you slipped on.
4. Fill in the blank, continue, type a few words of page 2, and **refresh**: the exact state is restored.
5. **Reset demo** (top right) wipes progress after confirmation.

### 60-second presenter run

1. Open the demo book and point out the source page beside the page being written.
2. In **Settings → Demo assist**, choose **70 characters per second** and **photosynthesis**, then run **Auto-type with correction**.
3. Answer the recall question with “oxygen”, complete its Echo blank, then use Demo assist to jump to page 6.
4. Auto-type page 6 with **pollination**, answer with “carries pollen”, and finish its Echo blank. The Memory Report then shows the page results and a returning-word round.

## Structure

| Path | Purpose |
| --- | --- |
| `src/data/bookData.ts` | Original passages, questions, accepted answers, concepts |
| `src/types.ts` | All shared types |
| `src/lib/typingEngine.ts` | Text normalisation, keystroke diffing, WPM / accuracy, hesitation tracking |
| `src/lib/echo.ts` | Deterministic weak-word scoring and fill-in-the-blank builder |
| `src/lib/recall.ts` | Answer normalisation and keyword matching |
| `src/lib/appState.ts` | Persisted state shape, validation and pure state transitions |
| `src/lib/sound.ts` | Web Audio effects (off by default, no audio files) |
| `src/hooks/useLocalStorage.ts` | Versioned persistence |
| `src/components/BookSpread.tsx`, `TypingPage.tsx` | The book (cover, two pages, page turn) and the Memory Ink typing surface |
| `src/components/LiveStats.tsx` | Typing stats pinned to the top of the screen while you type |
| `src/components/StatsPanel.tsx` | Recall (understanding) and book progress, shown below the book |
| `src/components/RecallModal.tsx`, `EchoReview.tsx` | Recall question and Echo Review dialogs |
| `src/components/FinishedBook.tsx` | Memory Report, Echo returns Memory Round, Copy summary |
| `src/components/SettingsMenu.tsx` | Sound and motion toggles, Reset demo, presenter Demo assist |
| `src/components/BookAssistantPanel.tsx` | Rakhu in-book chat panel |
| `api/assistant-chat.ts`, `api/generate-questions.ts` | Optional server-side Gemini endpoints; credentials stay in deployment environment |
| `src/components/ErrorBoundary.tsx` | Friendly recovery screen if anything unexpected throws |
| `public/sw.js`, `public/manifest.webmanifest` | Hand-written offline service worker and web app manifest |
| `docs/` | `PITCH.md`, `IMPACT.md`, `ROADMAP.md`, `one-pager.html`, layout screenshots |

## How Echo Review picks a word

Local and transparent, no AI model: each mistyped key scores 2, each correction 1, each long pause (2.5 s+) 1.5
(each capped at 3 events). A word scoring 3 or more on the page is "weak". If typing was clean but the recall
answer missed, the question's key concept is used instead.

## Memory Report

The finished screen shows per-page typing and recall results, a simple accuracy chart, words to watch, and a Memory
Round that brings weak words back. A first-try success retires a returned word; misses leave it marked as still shaky.
Use **Copy summary** to copy the report.

## Tests and layout checks

```bash
npm test          # pure typing, Echo, recall and saved-state logic
npm run test:e2e  # Chromium demo flow, refresh, reset, axe and viewport checks
```

The browser test saves screenshots at 1440, 1024, 768 and 375 pixels to `docs/screenshots/`. Install Playwright's
Chromium once with `npx playwright install chromium` if it is not already available.

## Offline check

Run `npm run build` and `npm run preview`, open the preview once, then use the browser's Application/Storage panel to
confirm the service worker is active. In DevTools, switch Network to Offline and refresh. The shell and its built
JavaScript/CSS assets are cached after the first production visit; saved progress remains in localStorage.

## Pitch and impact materials

- `docs/PITCH.md`: 3-minute script with timings, a 60-second live demo, and honest answers to likely judge questions.
- `docs/IMPACT.md`: problem and evidence levels, hypotheses, pilot plan, privacy and limitations. No invented statistics; sources are marked *to verify*.
- `docs/ROADMAP.md`: what exists today versus what comes next.
- `docs/one-pager.html`: single printable page (open in a browser, print to PDF).

## Known limitations

- Recall grading uses explicit accepted keywords and a small plural/one-typo rule; it is not a general assessment of understanding.
- Echo scoring is deterministic, local bookkeeping and does not infer meaning from free text.
- Progress is stored in this browser's localStorage and is not synced or encrypted.
- The offline cache takes effect in production after the first online load; the development server does not register a service worker.
- Lighthouse scores have not been measured in this environment.
- Demo assist auto-types pages, so speed numbers for those pages are not real typing performance.
- Six short, original, English passages are bundled as the demo book. Text-based PDF import is available, but scanned PDFs are not OCR'd and PDF extraction initially needs a network connection.
- Whether KeyTurn improves retention is a hypothesis. `docs/IMPACT.md` describes how to test it.
