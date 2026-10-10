# KeyTurn: impact, evidence and validation plan

KeyTurn is a prototype. Everything below separates **what is established**, **what is our hypothesis**, and **what
we would measure**. No statistics in this repository are invented; where a claim needs a source, it is marked
*to verify* with the reference the team should check before citing.

## The problem

People often study by re-reading and highlighting, which feel productive but tend to produce weaker long-term
memory than actively retrieving information. Typing tools, meanwhile, build speed on arbitrary text with no link
to understanding.

| Claim | Evidence level | Notes |
| --- | --- | --- |
| Re-reading and highlighting are low-utility study techniques; practice testing and spaced practice are high-utility | Established (review article), *to verify details* | Dunlosky et al. (2013) |
| Retrieving information from memory improves later retention more than re-studying it | Established, *to verify details* | Roediger & Karpicke (2006) |
| Spreading practice out over time beats massing it | Established, *to verify details* | Cepeda et al. (2006) |
| Typing a passage improves comprehension or memory | **Our hypothesis, not established** | Transcription may be shallow. The generation effect (Slamecka & Graf, 1978) is about *generating* items, not copying, so we do not claim it applies directly |
| Typing by hand vs laptop note-taking differences | **Contested**; do not cite as support | Mueller & Oppenheimer (2014) and later replication attempts disagree |
| Targeting review at a learner's own errors improves efficiency | Plausible, **our hypothesis** | The basis for Echo Review |

### Sources to verify before citing

- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest, 14*(1), 4-58.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249-255.
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354-380.
- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *Journal of Experimental Psychology: Human Learning and Memory, 4*(6), 592-604.

## Who it could help

Students revising dense material; language and vocabulary learners; professionals studying technical text; anyone who
finds passive reading hard to hold onto. KeyTurn makes **no medical, diagnostic or therapeutic claims**.

## Impact hypotheses

1. **H1: Retention.** After studying the same material, learners using KeyTurn recall more after a delay than learners who only re-read it.
2. **H2: Echo works.** Words returned in the Memory Round are remembered on the first try more often than a chance or untargeted baseline.
3. **H3: Engagement.** Learners finish more of a passage set with KeyTurn than with a plain re-reading task.
4. **H4: Separation is useful.** Showing typing and recall results separately helps learners notice when fast, accurate typing did not mean understanding.

## What the app measures today (all on-device)

- Typing: WPM, keystroke accuracy, mistyped keys, corrections, active time (per page and overall).
- Recall: correct / total per page, kept separate from typing.
- Echo: weak words, whether each was reviewed, and **first-try success when the word returns** (the "Echo effect" line).
- Copy summary exports these as plain text for a learner or teacher.

Note: pages typed with **Demo assist** are auto-typed, so their speed numbers are not real performance.

## Success metrics for a pilot

| Metric | How | Hypothesis |
| --- | --- | --- |
| Delayed recall score | Quiz on the same material 2-7 days later | H1 |
| First-try return rate | Memory Round, per learner | H2 |
| Session completion | Pages finished / pages started | H3 |
| Self-reported focus and effort | 1-5 rating after each session | H3 |
| Typing-vs-recall mismatch noticed | Short interview question | H4 |

## A small pilot plan (suggested, not yet run)

- **Design:** within-subject. Each participant studies two comparable passage sets: one with KeyTurn, one by re-reading. Counterbalance which set uses which method.
- **Size:** start with a class-sized group (for example 20-30 volunteers). This is a suggestion for a first look, not a power calculation.
- **Test:** the same short quiz after 2-7 days; compare scores within each person.
- **Ethics:** informed consent, no personal data collected by default (KeyTurn stores nothing off-device), results shared back with participants.
- **Honest reading of results:** a small pilot can suggest, not prove. Report null or negative results too.

## Privacy, safety and ethics

- No accounts, servers, trackers or analytics. Data lives in the browser's `localStorage` and can be wiped with **Reset demo**.
- If user-supplied text import is added, the learner is responsible for the rights to the text, and it should stay on-device.
- Accessibility: full keyboard use, visible focus, a reduced-motion toggle (defaults to the OS preference), sound off by default, errors never shown by colour alone.
- The Echo logic is deterministic and explainable in the UI ("How was this word chosen?").

## Limitations

- Transcription can become mechanical; recall and Echo exist to counter that, but we have not tested how well.
- Recall grading is keyword-based with simple plural and one-typo tolerance. It is not a general measure of understanding and can mark a correct paraphrase wrong.
- Only six short, original, English passages are bundled.
- Weak-word scoring is a heuristic; a slow typist may trigger "long pause" signals for reasons unrelated to memory.
- No evidence yet that KeyTurn improves outcomes. That is what the pilot is for.
