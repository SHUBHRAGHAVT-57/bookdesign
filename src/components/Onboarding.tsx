import { BOOK, PASSAGES } from '../data/bookData';
import WhyItWorks from './WhyItWorks';

interface OnboardingProps {
  onStart: () => void;
}

export default function Onboarding({ onStart }: OnboardingProps) {
  return (
    <section className="cover" aria-labelledby="cover-title">
      <div className="cover-board">
        <p className="cover-kicker">{BOOK.edition}</p>
        <h2 id="cover-title" className="cover-title">{BOOK.title}</h2>
        <p className="cover-sub">{BOOK.subtitle}</p>
        <p className="cover-owner">Written in your own hand</p>
      </div>
      <div className="cover-page">
        <h3 className="cover-heading">How this book works</h3>
        <ol className="cover-steps">
          <li><strong>Read</strong> the source passage on the left page.</li>
          <li><strong>Type</strong> it into your own page on the right. Correct letters turn into permanent ink.</li>
          <li><strong>Recall</strong> one idea from the page in a short question.</li>
          <li><strong>Review</strong> a word you stumbled on in a quick fill-in-the-blank.</li>
          <li><strong>Remember</strong> by finishing all {PASSAGES.length} pages.</li>
        </ol>
        <WhyItWorks />
        <p className="cover-note">
          Everything runs on this device and works offline. Your progress is saved automatically, so you can
          refresh at any time.
        </p>
        <button type="button" className="btn btn-primary btn-large" onClick={onStart}>
          Open the demo book
        </button>
      </div>
    </section>
  );
}
