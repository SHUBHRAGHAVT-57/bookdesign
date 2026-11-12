import { BOOK, PASSAGES } from '../data/bookData';
import WhyItWorks from './WhyItWorks';

interface OnboardingProps {
  onStart: () => void;
}

export default function Onboarding({ onStart }: OnboardingProps) {
  return (
    <section className="library" aria-labelledby="cover-title">
      <div className="library-intro">
        <h2 id="cover-title">Read closely.<br />Type deliberately.</h2>
        <p className="library-description">A quiet place to practise accuracy and recall. Work through a passage, put it into your own keystrokes, then see what stayed with you.</p>
        <div className="session-launch">
          <div className="session-book-mark" aria-hidden="true">
            <svg viewBox="0 0 32 36" fill="none"><path d="M5 4h22v28H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 26h22M11 10h10M11 15h7" stroke="currentColor" strokeWidth="1.5"/></svg>
          </div>
          <div><h3>{BOOK.title}</h3><p>{BOOK.edition} · {PASSAGES.length} passages</p></div>
          <button type="button" className="btn btn-primary btn-large" onClick={onStart}>Open the demo book <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>
        <section className="practice-method" aria-labelledby="method-title">
          <h3 id="method-title">A little more than a typing test.</h3>
          <ol>
            <li><strong>Type with attention</strong><span>Correct each passage as you go. Speed and accuracy come from your actual keystrokes.</span></li>
            <li><strong>Recall the idea</strong><span>Answer a short question after each spread. Understanding has its own score.</span></li>
            <li><strong>Return to the tricky words</strong><span>Echo Review brings back the words that need another look.</span></li>
          </ol>
          <WhyItWorks />
        </section>
        <p className="library-local-note">No account needed. Practice works offline after the first load. Progress stays in this browser when storage is available.</p>
      </div>
      <aside className="library-contents" aria-labelledby="contents-title">
        <header><h3 id="contents-title">Inside {BOOK.title}</h3><p>{BOOK.subtitle}</p></header>
        <ol>{PASSAGES.map((passage, index) => <li key={passage.id}>
          <span className="contents-index">{String(index + 1).padStart(2, '0')}</span>
          <div><h4>{passage.title}</h4><p>{passage.chapterTitle}</p></div>
          <span className="contents-length">{passage.text.split(/\s+/).length} words</span>
        </li>)}</ol>
        <p className="contents-note">Original short passages. One spread at a time.</p>
      </aside>
    </section>
  );
}
