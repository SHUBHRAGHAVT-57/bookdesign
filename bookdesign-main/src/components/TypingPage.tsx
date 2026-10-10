import { memo, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent, ReactElement, SyntheticEvent } from 'react';
import type { WordMap } from '../types';
import { countWrong } from '../lib/typingEngine';

interface GroupProps {
  /** Target characters for this word plus the space that follows it. */
  chars: string;
  typedPart: string;
  /** Index of the next character to type inside this group, or -1. */
  cursor: number;
  wordLength: number;
  mistakeFlash: 'a' | 'b' | null;
}

/** One word (and its trailing space). Memoised so only the word being typed re-renders. */
const WordGroup = memo(function WordGroup({ chars, typedPart, cursor, wordLength, mistakeFlash }: GroupProps) {
  const cells: ReactElement[] = [];
  for (let i = 0; i < chars.length; i++) {
    let state = 'up';
    let shown = chars[i];
    if (i < typedPart.length) {
      if (typedPart[i] === chars[i]) {
        state = 'ink';
      } else {
        state = 'bad';
      }
    } else if (i === cursor) {
      state = 'cur';
    }
    cells.push(
      <span
        key={i}
        className={`ch ${state}${state === 'bad' && i === cursor && mistakeFlash ? ` mistake-flash-${mistakeFlash}` : ''}`}
      >
        {shown}
      </span>,
    );
  }
  return (
    <span className={`grp${cursor >= 0 ? ' is-current' : ''}`}>
      <span className="w">{cells.slice(0, wordLength)}</span>
      {cells.length > wordLength && <span className="sp">{cells.slice(wordLength)}</span>}
    </span>
  );
});

interface TypingPageProps {
  passageId: string;
  target: string;
  map: WordMap;
  typed: string;
  disabled: boolean;
  complete: boolean;
  ariaLabel: string;
  onType: (raw: string) => void;
}

export default function TypingPage({ passageId, target, map, typed, disabled, complete, ariaLabel, onType }: TypingPageProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [mistakeFlash, setMistakeFlash] = useState(false);

  // Put the cursor on the new page automatically (not while a modal or page turn is active).
  useEffect(() => {
    if (!disabled) areaRef.current?.focus({ preventScroll: true });
  }, [passageId, disabled]);

  // Keep the character being typed visible: clear of the pinned stats bar above and, on phones,
  // of the on-screen keyboard below (visualViewport shrinks when the keyboard opens).
  const keepCaretVisible = (): void => {
    const cur = areaRef.current?.parentElement?.querySelector('.ch.cur');
    if (!cur) return;
    const viewport = window.visualViewport;
    const bar = document.querySelector('.live-stats')?.getBoundingClientRect();
    const top = Math.max(bar ? bar.bottom + 16 : 0, (viewport?.offsetTop ?? 0) + 16);
    const bottom = (viewport ? viewport.offsetTop + viewport.height : window.innerHeight) - 56;
    const rect = cur.getBoundingClientRect();
    if (rect.top < top || rect.bottom > bottom) {
      window.scrollBy({ top: rect.top - (top + bottom) / 2, behavior: 'auto' });
    }
  };

  useEffect(() => {
    if (disabled) return;
    keepCaretVisible();
  }, [typed, disabled]);

  useEffect(() => {
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', keepCaretVisible);
    return () => viewport?.removeEventListener('resize', keepCaretVisible);
  }, []);

  const wrong = countWrong(typed, target);
  const errorIndex = typed.split('').findIndex((char, index) => char !== target[index]);
  const cursorPosition = errorIndex === -1 ? typed.length : errorIndex;
  const flashClass = errorIndex === -1 ? null : mistakeFlash ? 'a' : 'b';
  const helpId = ariaLabel.includes('left page') ? 'typing-help-left' : 'typing-help-right';

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const raw = event.target.value;
    if (
      raw.length > typed.length &&
      raw.split('').some((char, index) => char !== target[index])
    ) {
      setMistakeFlash((current) => !current);
    }
    onType(raw);
  };
  const block = (event: ClipboardEvent<HTMLTextAreaElement> | DragEvent<HTMLTextAreaElement>): void =>
    event.preventDefault();
  // The caret always stays at the end, like writing on a page: you only ever add or delete the latest ink.
  const keepCaretAtEnd = (event: SyntheticEvent<HTMLTextAreaElement>): void => {
    const el = event.currentTarget;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  };

  let statusText = '';
  if (complete) statusText = 'Page complete. Every line is now ink.';
  else if (wrong > 0) statusText = 'Mistake. Press Backspace once to clear it, then type the highlighted letter.';

  return (
    <div className="typing">
      <div className={`typing-area${focused ? ' is-focused' : ''}`}>
        <p className="prose typed-text" aria-hidden="true">
          {map.words.map((word, index) => {
            const hasSpace = word.end < target.length;
            const groupEnd = word.end + (hasSpace ? 1 : 0);
            const inGroup = cursorPosition >= word.start && cursorPosition < groupEnd;
            return (
              <WordGroup
                key={index}
                chars={target.slice(word.start, groupEnd)}
                typedPart={typed.slice(word.start, groupEnd)}
                cursor={inGroup ? cursorPosition - word.start : -1}
                wordLength={word.end - word.start}
                mistakeFlash={inGroup ? flashClass : null}
              />
            );
          })}
        </p>
        <textarea
          ref={areaRef}
          className="typing-input"
          value={typed}
          readOnly={disabled}
          onChange={onChange}
          onPaste={block}
          onDrop={block}
          onSelect={keepCaretAtEnd}
          onFocus={() => {
            setFocused(true);
            window.requestAnimationFrame(keepCaretVisible);
          }}
          onBlur={() => setFocused(false)}
          aria-label={ariaLabel}
          aria-describedby={helpId}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <p id={helpId} className="typing-help">
        {complete
          ? 'Page complete. Every line is now ink.'
          : wrong > 0
            ? 'Mistake: press Backspace once to clear it, then type the highlighted letter.'
            : focused
              ? 'Each page has its own passage. Finish this page to continue to the next; Backspace fixes mistakes.'
              : 'Click or tap the active page to type its passage. The two pages have different text; pasting is disabled.'}
      </p>
      <p className="visually-hidden" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
