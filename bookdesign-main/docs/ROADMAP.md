# KeyTurn roadmap

## What exists today (this repository)

- Offline book experience: source page, personal Memory Edition, Memory Ink, page turn, sound and reduced-motion toggles.
- Real typing engine: normalisation, corrections, WPM, accuracy, idle-aware timer, hesitation tracking.
- Recall question per page, scored separately from typing.
- Echo Review (deterministic weak-word scoring) and Echo returns in a Memory Round, with a first-try "mastered" status.
- Memory Report, page history (read-only look back), Copy summary, Demo assist for presenters.
- Local persistence with validation, error boundary, service-worker offline support, unit and browser tests.

## Next (small, high value)

1. **Import your own text** (paste or `.txt`), kept on-device, with automatic passage splitting and user-written or optional questions.
2. **Cross-session review:** bring weak words back on later days, using simple expanding intervals.
3. **Export** the weak-word list and recall results as CSV for Anki or a spreadsheet.
4. **Accessibility modes:** high-contrast theme, selectable reading font (including dyslexia-friendly options), larger text steps.
5. **Language packs:** non-English text, keyboard layouts and IME-friendly input.

## Later (needs design and evidence first)

- **Teacher / class mode:** opt-in sharing of aggregate results. Needs a privacy design before any server exists.
- **Question authoring help:** optional model-assisted question drafts that a human reviews. Not shipped without review, and kept optional so the offline, explainable core stays intact.
- **Native mobile apps** for better keyboard handling.
- **A real pilot study** (see `IMPACT.md`) to learn whether any of this improves retention, then decide what to keep.

## Deliberately not planned

Social feeds, public leaderboards of personal text, and any claim of medical or therapeutic benefit.
