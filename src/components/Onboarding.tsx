import { BOOK, PASSAGES } from '../data/bookData';
import type { Difficulty } from '../types';
import WhyItWorks from './WhyItWorks';

interface OnboardingProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStart: () => void;
}

export default function Onboarding({ difficulty, onDifficultyChange, onStart }: OnboardingProps) {
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
        <fieldset className="difficulty-picker">
          <legend className="cover-heading">Choose your difficulty</legend>
          <p className="cover-note">How many recall questions should each page ask?</p>
          <div className="difficulty-options">
            {([
              { value: 'easy', label: 'Easy', count: 2, detail: 'A gentle start' },
              { value: 'medium', label: 'Medium', count: 4, detail: 'Balanced practice' },
              { value: 'hard', label: 'Hard', count: 6, detail: 'Full recall challenge' },
            ] as const).map((option) => (
              <label className={`difficulty-option${difficulty === option.value ? ' is-selected' : ''}`} key={option.value}>
                <input type="radio" name="difficulty" value={option.value} checked={difficulty === option.value} onChange={() => onDifficultyChange(option.value)} />
                <span className="difficulty-option-title">{option.label}</span>
                <span className="difficulty-option-count">{option.count} questions/page</span>
                <span className="difficulty-option-detail">{option.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <WhyItWorks />
        <p className="cover-note">
          Everything runs on this device and works offline. Your progress is saved automatically, so you can
          refresh at any time.
        </p>
        <button type="button" className="btn btn-primary btn-large" onClick={onStart}>
          Start practice
        </button>
      </div>
    </section>
  );
}
