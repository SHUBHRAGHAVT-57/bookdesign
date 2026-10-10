import type { ReactNode } from 'react';

interface BookSpreadProps {
  leftChapterLabel: string;
  rightChapterLabel: string;
  leftTitle: string;
  rightTitle: string;
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
  leftChapterLabel,
  rightChapterLabel,
  leftTitle,
  rightTitle,
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
    <article className={`spread${complete ? ' is-complete' : ''}`} aria-label={`Book spread: ${leftTitle} and ${rightTitle}`}>
      <section className="page page-left" aria-label={`Left typing practice page: ${leftTitle}`}>
        <header className="page-head">
          <span className="page-label">Typing practice · Left</span>
          <span className="page-chapter">{leftChapterLabel}</span>
        </header>
        <h2 id="source-title" className="page-title">{leftTitle}</h2>
        <div className="page-body">{source}</div>
        <footer className="page-foot">
          <span className="page-no">{leftPageNumber}</span>
        </footer>
      </section>

      <section className={`page page-right${turning ? ' is-turning' : ''}`} aria-label={`Right typing practice page: ${rightTitle}`}>
        <div className="page-inner">
          <header className="page-head">
            <span className="page-label page-label-accent">Typing practice · Right</span>
            <span className="page-chapter">{rightChapterLabel}</span>
          </header>
          <h2 id="memory-title" className="page-title">{rightTitle}</h2>
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
                <span className="page-label page-label-accent">Typing practice · Right</span>
                <span className="page-chapter">{rightChapterLabel}</span>
              </div>
              <p className="page-title">{rightTitle}</p>
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
