import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Passage } from '../types';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AssistantPanelProps = {
  bookTitle: string;
  passage: Passage;
  pageNumber: number;
  onClose: () => void;
};

function readHistory(key: string): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ChatMessage =>
      typeof item === 'object' && item !== null &&
      ((item as ChatMessage).role === 'user' || (item as ChatMessage).role === 'assistant') &&
      typeof (item as ChatMessage).content === 'string',
    ).slice(-30);
  } catch {
    return [];
  }
}

export default function AssistantPanel({ bookTitle, passage, pageNumber, onClose }: AssistantPanelProps) {
  const storageKey = useMemo(() => `keyturn.assistant.${bookTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'book'}`, [bookTitle]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => readHistory(storageKey));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch { /* chat still works for this session */ }
  }, [messages, storageKey]);

  useEffect(() => {
    setMessages(readHistory(storageKey));
  }, [storageKey]);

  const send = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || busy) return;
    const updated = [...messages, { role: 'user' as const, content: prompt }].slice(-30);
    setMessages(updated);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle,
          context: {
            chapter: passage.chapterTitle,
            chapterNumber: passage.chapterNumber,
            passageTitle: passage.title,
            passageText: passage.text,
            pageNumber,
          },
          messages: updated.slice(-12),
        }),
      });
      const payload: unknown = await response.json();
      const data = payload as { reply?: unknown; error?: unknown };
      if (!response.ok || typeof data.reply !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'The assistant could not respond. Try again.');
      }
      setMessages((current) => [...current, { role: 'assistant' as const, content: data.reply as string }].slice(-30));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="assistant-panel" aria-label="KeyTurn AI assistant">
      <header className="assistant-panel-head">
        <div><span className="assistant-eyebrow">KEYTURN STUDY COMPANION</span><h2>Friendly tutor ✦</h2><p>Chapter {passage.chapterNumber} · {passage.title}</p></div>
        <button type="button" className="assistant-close" onClick={onClose} aria-label="Close assistant">×</button>
      </header>
      <div className="assistant-context"><strong>Reading context</strong><span>{bookTitle} · page {pageNumber}</span><small>Book + AI knowledge · chat pauses typing</small></div>
      <div className="assistant-messages" aria-live="polite">
        {messages.length === 0 && <div className="assistant-welcome"><span>✦</span><h3>What would you like to understand?</h3><p>I can explain this passage, define a word, summarise the idea, or quiz you on what you read.</p></div>}
        {messages.map((message, index) => <div key={index} className={`assistant-message ${message.role}`}><span>{message.role === 'user' ? 'You' : 'KeyTurn'}</span><p>{message.content}</p></div>)}
        {busy && <div className="assistant-typing" role="status">Thinking through your question…</div>}
      </div>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <form className="assistant-compose" onSubmit={send}>
        <textarea aria-label="Ask the assistant" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about this passage…" rows={2} maxLength={1200} disabled={busy} />
        <button type="submit" disabled={busy || !draft.trim()}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
      <p className="assistant-privacy">Your passage and recent chat are sent to Gemini when you ask. Chat history is saved in this browser.</p>
    </aside>
  );
}
