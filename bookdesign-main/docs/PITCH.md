# KeyTurn: 3-minute pitch

**One line:** KeyTurn turns reading into active reading: read, type, recall, review, remember. It then brings back
exactly the words you stumbled on.

> Use the live app for the demo. Everything runs offline in the browser, so there is nothing to connect.
> Before going on stage: open the app once with a network, then run **Reset demo** so you start on the cover.

## Script and timing

| Time | Beat | Say / do |
| --- | --- | --- |
| 0:00 – 0:20 | **Hook** | "Think of the last chapter you read. Close your eyes. What can you actually remember?" Pause. "Most of us read, nod, and forget." |
| 0:20 – 0:45 | **Problem** | Re-reading and highlighting feel productive but are weak study techniques (see `IMPACT.md`, label: *to verify*). Typing tools train speed on random text and never ask whether you understood anything. |
| 0:45 – 1:05 | **Solution** | Point at the cover. "KeyTurn is a book you write yourself. **Read** the left page, **Type** it into your own page, **Recall** one idea, **Review** the words you struggled with, **Remember**." |
| 1:05 – 2:00 | **Live demo** (60 s, see below) | Auto-type with Demo assist so the story is reliable. Narrate the ink, the typo and correction, recall at the spread checkpoint, the Echo card, and the page turn. |
| 2:00 – 2:25 | **Impact** | "The report keeps typing and understanding apart on purpose. High typing accuracy never claims you understood. And the **Echo effect** line shows how many weak words you actually brought back on the first try." |
| 2:25 – 2:45 | **Why it's different** | Starts from the reading itself, not flashcards you have to make. Review is targeted at *your* mistakes. Transparent rules, no black box. Works offline; all data stays on the device. |
| 2:45 – 3:00 | **Next + ask** | Import your own text, teacher mode, a pilot study to measure retention. "We'd love a classroom to pilot this with." |

## Live demonstration

1. Click **Open the demo book** and point out the active typing page and live statistics.
2. In **Settings → Demo assist**, choose a speed and a deliberate typo, then use **Auto-type with correction**. Explain that automatic speed is demonstration data.
3. Complete the active spread, continuing into its second passage when needed. At the recall checkpoint, answer the displayed question; typing and recall are scored separately.
4. Complete any Echo Review offered for a weak word, then continue through the book.
5. Open the **Memory Report** and its returning-word round. Explain that the report records performance in this session; it does not prove long-term retention.

Use **Reset demo** to return to the cover after confirming deletion of saved progress. Rehearse on the exact branch and build being presented; feature branches can have different flows.

## Likely judge questions (honest answers)

**Does it actually improve retention?**
Not yet proven, and we say so. It combines practices with strong research support (retrieval practice, spaced
re-exposure), but the specific effect of KeyTurn is a hypothesis. `IMPACT.md` has a small, concrete pilot plan to test it.

**Why not Anki or Quizlet?**
They start from flashcards someone has to write. KeyTurn starts from the reading itself and uses typing as the
engagement step, then ties review to what *you* actually got wrong. They are complementary; an export to those tools is on the roadmap.

**Isn't typing just copying?**
Partly, and that is a real limitation. Transcription alone can be shallow, which is exactly why recall and
targeted review are built into the flow instead of stopping at typing.

**How does Echo select a word?**
Echo uses a deterministic local score based on mistyped keys, corrections and long pauses. The selection can be inspected and explained to a student or teacher. Recall grading uses the bundled accepted-answer rules.

**What about privacy?**
No accounts, no servers, no analytics. Progress lives in the browser's local storage on the learner's device.

**How would this scale?**
Static files, so hosting is trivial. The real work is content: user-supplied text import, then teacher tools. See `ROADMAP.md`.

**Can people cheat?**
Pasting is disabled and a page only completes when the text is exactly right. Recall answers are checked locally
against accepted keywords, which is generous but not a general test of understanding. We list that as a limitation.

**Who is it for?**
Students revising dense material, language and vocabulary learners, professionals studying technical text, and
anyone who finds passive reading hard to hold onto. We make no medical or therapeutic claims.
