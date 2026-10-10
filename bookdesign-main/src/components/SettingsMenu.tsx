import { useEffect, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import type { Settings } from '../types';

interface SettingsMenuProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  onReset: () => void;
  pageIndex: number;
  pageCount: number;
  demoWords: string[];
  demoTyping: boolean;
  onDemoJump: (pageIndex: number) => void;
  onDemoType: (charsPerSecond: number, word: string) => void;
}

export default function SettingsMenu({
  settings,
  onChange,
  onReset,
  pageIndex,
  pageCount,
  demoWords,
  demoTyping,
  onDemoJump,
  onDemoType,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [jumpIndex, setJumpIndex] = useState(pageIndex);
  const [speed, setSpeed] = useState(45);
  const [word, setWord] = useState(demoWords[0] ?? '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setJumpIndex(pageIndex);
  }, [pageIndex]);

  useEffect(() => {
    if (!demoWords.includes(word)) setWord(demoWords[0] ?? '');
  }, [demoWords, word]);

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) setOpen(false);
  };

  return (
    <div className="header-actions">
      <div className="settings" ref={wrapRef} onBlur={onBlur}>
        <button
          ref={buttonRef}
          type="button"
          className="btn"
          aria-expanded={open}
          aria-controls="settings-panel"
          onClick={() => setOpen((v) => !v)}
        >
          Settings
        </button>
        {open && (
          <div id="settings-panel" className="settings-panel" role="group" aria-label="Settings">
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => onChange({ ...settings, sound: e.target.checked })}
              />
              <span>
                Sound effects
                <small>Soft key ticks and a page-turn rustle. Off by default.</small>
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onChange({ ...settings, reducedMotion: e.target.checked })}
              />
              <span>
                Reduce motion
                <small>Turns off the page turn and ink transitions.</small>
              </span>
            </label>
            <div className="demo-assist">
              <button type="button" className="demo-assist-toggle" aria-expanded={demoOpen} onClick={() => setDemoOpen((value) => !value)}>
                Demo assist
              </button>
              {demoOpen && (
                <div className="demo-assist-panel" role="group" aria-label="Demo assist">
                  <label>
                    Jump to page
                    <select className="field" value={jumpIndex} onChange={(event) => setJumpIndex(Number(event.target.value))}>
                      {Array.from({ length: pageCount }, (_, index) => <option key={index} value={index}>Page {index + 1}</option>)}
                    </select>
                  </label>
                  <button type="button" className="btn" onClick={() => onDemoJump(jumpIndex)}>Go to page</button>
                  <label>
                    Typing speed
                    <select className="field" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                      <option value={24}>24 characters per second</option>
                      <option value={45}>45 characters per second</option>
                      <option value={70}>70 characters per second</option>
                    </select>
                  </label>
                  <label>
                    Scripted stumble
                    <select className="field" value={word} onChange={(event) => setWord(event.target.value)} disabled={demoWords.length === 0}>
                      {demoWords.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <button type="button" className="btn btn-primary" disabled={demoTyping || demoWords.length === 0} onClick={() => onDemoType(speed, word)}>
                    {demoTyping ? 'Typing this page…' : 'Auto-type with correction'}
                  </button>
                  <p className="demo-assist-note">Uses the real typing and Backspace path. The correction counts in your report.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <button type="button" className="btn btn-quiet" onClick={onReset}>
        Reset demo
      </button>
    </div>
  );
}
