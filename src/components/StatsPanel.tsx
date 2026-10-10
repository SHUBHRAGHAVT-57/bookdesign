import type { BookSummary } from '../types';

interface StatsPanelProps {
  book: BookSummary;
  totalPages: number;
}

/** Slower-moving stats: recall (understanding) and overall book progress. */
export default function StatsPanel({ book, totalPages }: StatsPanelProps) {
  return (
    <section className="stats" aria-labelledby="stats-title">
      <h2 id="stats-title" className="visually-hidden">Recall and book progress</h2>

      <div className="stats-group">
        <h3>Recall <span className="stats-sub">understanding</span></h3>
        <p className="stats-big">{book.recallCorrect} of {book.recallAnswered} <span>questions right</span></p>
        <p className="stats-note">
          Typing accuracy measures keystrokes only. It does not show whether you understood the page, which is
          why recall is scored separately.
        </p>
      </div>

      <div className="stats-group">
        <h3>Book progress</h3>
        <div
          className="meter"
          role="progressbar"
          aria-label="Pages completed"
          aria-valuemin={0}
          aria-valuemax={totalPages}
          aria-valuenow={book.pagesCompleted}
        >
          <span style={{ width: `${(book.pagesCompleted / totalPages) * 100}%` }} />
        </div>
        <p className="stats-note">
          {book.pagesCompleted} of {totalPages} pages completed
          {book.pagesCompleted > 0 ? ` \u00B7 ${book.wpm} WPM overall` : ''}
        </p>
      </div>
    </section>
  );
}
