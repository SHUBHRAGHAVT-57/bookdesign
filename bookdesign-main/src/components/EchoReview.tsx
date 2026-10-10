import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { EchoPlan, EchoResult, Passage } from '../types';
import { buildExercise, checkEchoAnswer } from '../lib/echo';
import Modal from './Modal';

type Status = 'idle' | 'wrong' | 'correct' | 'revealed';

interface EchoReviewProps {
  passage: Passage;
  plan: EchoPlan;
  isLast: boolean;
  onDone: (result: EchoResult) => void;
}

export default function EchoReview({ passage, plan, isLast, onDone }: EchoReviewProps) {
  const exercise = useMemo(() => buildExercise(passage.text, plan.word), [passage.text, plan.word]);
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<Status>('idle');

  const finished = status === 'correct' || status === 'revealed';

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (finished || value.trim() === '') return;
    setAttempts((n) => n + 1);
    setStatus(checkEchoAnswer(value, plan.word) ? 'correct' : 'wrong');
  };

  const done = (): void =>
    onDone({ word: plan.word, solved: status === 'correct', attempts, revealed: status === 'revealed' });

  return (
    <Modal labelledBy="echo-title" describedBy="echo-reason">
      <p className="modal-kicker">Review · {passage.title}</p>
      <h2 id="echo-title" className="modal-title">Echo Review</h2>
      <p id="echo-reason" className="echo-reason">{plan.reason}</p>

      {exercise ? (
        <form onSubmit={submit} noValidate>
          <p className="echo-sentence prose">
            {exercise.before}
            <label className="visually-hidden" htmlFor="echo-input">Missing word</label>
            <input
              id="echo-input"
              className="echo-blank"
              style={{ width: `${Math.max(plan.word.length + 2, 8)}ch` }}
              type="text"
              value={finished ? plan.word : value}
              onChange={(e) => setValue(e.target.value)}
              readOnly={finished}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="echo-hint"
            />
            {exercise.after}
          </p>
          <p id="echo-hint" className="modal-note">Hint: {exercise.hint}.</p>

          {status === 'wrong' && (
            <p className="feedback is-wrong" role="status">
              <span className="feedback-mark" aria-hidden="true">{'✕'}</span>
              <span>Not yet. Look at the hint and try again.</span>
            </p>
          )}
          {status === 'correct' && (
            <p className="feedback is-right" role="status">
              <span className="feedback-mark" aria-hidden="true">{'✓'}</span>
              <span>Echoed. “{plan.word}” is back in your memory.</span>
            </p>
          )}
          {status === 'revealed' && (
            <p className="feedback" role="status">
              <span className="feedback-mark" aria-hidden="true">i</span>
              <span>The missing word was “{plan.word}”. You will see it again if it keeps tripping you up.</span>
            </p>
          )}

          <details className="why">
            <summary>How was this word chosen?</summary>
            {plan.stats ? (
              <p>
                A simple local score: each mistyped key counts 2, each correction 1 and each long pause 1.5.
                “{plan.word}” scored {plan.stats.score} ({plan.stats.errors} mistyped,{' '}
                {plan.stats.corrections} corrected, {plan.stats.pauses} paused). No AI model is involved, and
                it works fully offline.
              </p>
            ) : (
              <p>
                You typed this page cleanly, but the recall answer missed the idea, so the key word from the
                question was chosen. This is fixed lookup data, not an AI model, and works offline.
              </p>
            )}
          </details>

          <div className="modal-actions">
            {!finished && (
              <>
                {attempts >= 2 && (
                  <button type="button" className="btn" onClick={() => setStatus('revealed')}>
                    Show the word
                  </button>
                )}
                <button type="submit" className="btn btn-primary">Check word</button>
              </>
            )}
            {finished && (
              <button type="button" className="btn btn-primary" onClick={done} autoFocus>
                {isLast ? 'Finish the book' : 'Next page'}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onDone({ word: plan.word, solved: false, attempts: 0, revealed: true })}
          >
            {isLast ? 'Finish the book' : 'Next page'}
          </button>
        </div>
      )}
    </Modal>
  );
}
