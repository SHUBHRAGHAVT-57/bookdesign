import type { AppState, BookSummary, Passage } from '../types';
import { formatDuration, summarizePage } from '../lib/typingEngine';
import type { ActivitySummary } from '../lib/activity';

interface ActivityDashboardProps {
  state: AppState;
  summary: BookSummary;
  passages: Passage[];
  activity: ActivitySummary;
  onClose: () => void;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
}

export default function ActivityDashboard({ state, summary, passages, activity, onClose }: ActivityDashboardProps) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString();
    const count = activity.sessions.filter((session) => new Date(session.startedAt).toLocaleDateString() === key).length;
    return { date, count };
  });
  const maxVisits = Math.max(1, ...days.map((day) => day.count));
  const recallPercent = percent(summary.recallCorrect, summary.recallAnswered);
  const totalWords = passages.reduce((sum, passage) => sum + passage.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const completedWords = passages.reduce((sum, passage) => {
    const progress = state.pages[passage.id];
    return sum + (progress ? progress.typed.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const totalKeys = Object.values(state.pages).reduce((sum, page) => sum + page.metrics.totalTyped, 0);
  const corrected = Object.values(state.pages).reduce((sum, page) => sum + page.metrics.correctedErrors, 0);
  const mistakes = Object.values(state.pages).reduce((sum, page) => sum + page.metrics.incorrectKeystrokes, 0);
  const uniqueDays = new Set(activity.sessions.map((session) => new Date(session.startedAt).toLocaleDateString())).size;

  return (
    <div className="activity-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="activity-dashboard" role="dialog" aria-modal="true" aria-labelledby="activity-title">
        <header className="activity-head">
          <div>
            <p className="activity-eyebrow">KEYTURN · PERSONAL INSIGHTS</p>
            <h2 id="activity-title">Activity dashboard</h2>
            <p>Your reading, typing and recall progress on this browser.</p>
          </div>
          <button type="button" className="activity-close" onClick={onClose} aria-label="Close activity dashboard">×</button>
        </header>

        <div className="activity-grid">
          <article className="activity-card activity-card-featured"><span>Typing speed</span><strong>{summary.wpm}<small> WPM</small></strong><p>Average across saved passage practice</p></article>
          <article className="activity-card"><span>Keystroke accuracy</span><strong>{summary.accuracy}%</strong><p>{mistakes} incorrect keystrokes recorded</p></article>
          <article className="activity-card"><span>Active typing time</span><strong>{formatDuration(summary.activeMs)}</strong><p>Idle time is excluded by the typing timer</p></article>
          <article className="activity-card"><span>Recall score</span><strong>{recallPercent}%</strong><p>{summary.recallCorrect} correct of {summary.recallAnswered} answered</p></article>
          <article className="activity-card"><span>Characters attempted</span><strong>{totalKeys.toLocaleString()}</strong><p>{corrected} corrections made with backspace</p></article>
          <article className="activity-card"><span>Reading progress</span><strong>{summary.pagesCompleted}<small> / {passages.length} pages</small></strong><p>{percent(summary.pagesCompleted, passages.length)}% of this book completed</p></article>
        </div>

        <div className="activity-lower">
          <section className="activity-section">
            <div className="activity-section-title"><h3>Visits · last 7 days</h3><span>{activity.totalSessions} total</span></div>
            <div className="activity-bars" role="img" aria-label="App visits for the last seven days">
              {days.map((day) => (
                <div className="activity-bar-column" key={day.date.toISOString()}>
                  <strong>{day.count || ''}</strong>
                  <div className="activity-bar-track"><span style={{ height: `${day.count ? Math.max(8, (day.count / maxVisits) * 100) : 0}%` }} /></div>
                  <small>{dayLabel(day.date)}</small>
                </div>
              ))}
            </div>
            <p className="activity-muted">{uniqueDays} active calendar days recorded on this browser.</p>
          </section>
          <section className="activity-section">
            <div className="activity-section-title"><h3>Page performance</h3><span>{completedWords.toLocaleString()} / {totalWords.toLocaleString()} words typed</span></div>
            <div className="activity-page-list">
              {passages.map((passage, index) => {
                const progress = state.pages[passage.id];
                const stats = progress ? summarizePage(progress, passage.text) : null;
                const recall = state.recall[passage.id];
                const width = stats?.percent ?? 0;
                return <div className="activity-page-row" key={passage.id}>
                  <div className="activity-page-meta"><span>{index + 1}. {passage.title}</span><small>{stats ? `${width}% typed · ${stats.wpm} WPM` : 'Not started'}{recall ? ` · Recall ${recall.correct ? '✓' : 'missed'}` : ''}</small></div>
                  <div className="activity-page-track"><span style={{ width: `${width}%` }} /></div>
                </div>;
              })}
            </div>
          </section>
        </div>
        <footer className="activity-foot">
          <p><strong>Privacy &amp; login stats:</strong> KeyTurn currently has no account/login system. “Visits” are app opens recorded locally in this browser, not authenticated logins. Typing and recall stats are calculated from saved local progress; no analytics are sent to a server. Clearing browser storage removes this history.</p>
        </footer>
      </section>
    </div>
  );
}
