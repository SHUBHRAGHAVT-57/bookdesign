import type { ReactNode } from 'react';

interface BookSpreadProps {
  chapterLabel: string;
  title: string;
  leftPageNumber: number;
  rightPageNumber: number;
  source: ReactNode;
  memory: ReactNode;
  /** Text shown on the turning leaf (the page being turned). */
  leafText: string;
  turning: boolean;
  complete: boolean;
}

export default function BookSpread({
  chapterLabel,
  title,
  leftPageNumber,
  rightPageNumber,
  source,
  memory,
  leafText,
  turning,
  complete,
}: BookSpreadProps) {
  return (
    <div className="book">
    <article className={`spread${complete ? ' is-complete' : ''}`} aria-label={`${chapterLabel}: ${title}`}>
      <section className="page page-left" aria-label={`Source passage: ${title}`}>
        <header className="page-head">
          <span className="page-label">Source passage</span>
          <span className="page-chapter">{chapterLabel}</span>
        </header>
        <h2 id="source-title" className="page-title">{title}</h2>
        <div className="page-body">{source}</div>
        <footer className="page-foot">
          <span className="page-no">{leftPageNumber}</span>
        </footer>
      </section>

      <section className={`page page-right${turning ? ' is-turning' : ''}`} aria-label={`Memory Edition: ${title}`}>
        <div className="page-inner">
          <header className="page-head">
            <span className="page-label page-label-accent">Your Memory Edition</span>
            <span className="page-chapter">{chapterLabel}</span>
          </header>
          <h2 id="memory-title" className="page-title">{title}</h2>
          <div className="page-body">{memory}</div>
          <footer className="page-foot page-foot-right">
            {complete && <span className="ink-stamp">Inked</span>}
            <span className="page-no">{rightPageNumber}</span>
          </footer>
        </div>

        {turning && (
          <div className="leaf" aria-hidden="true">
            <div className="leaf-face leaf-front">
              <div className="page-head">
                <span className="page-label page-label-accent">Your Memory Edition</span>
                <span className="page-chapter">{chapterLabel}</span>
              </div>
              <p className="page-title">{title}</p>
              <p className="prose leaf-text">{leafText}</p>
            </div>
            <div className="leaf-face leaf-back">
              <span className="page-no">{leftPageNumber}</span>
            </div>
          </div>
        )}
      </section>
    </article>
    </div>
  );
}
