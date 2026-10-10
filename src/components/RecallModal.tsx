import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EchoPlan, Passage, RecallResult } from '../types';
import Modal from './Modal';

interface RecallModalProps {
  passage: Passage;
  result: RecallResult | undefined;
  echoPlan: EchoPlan | null;
  isLast: boolean;
  onSubmit: (answer: string) => void;
  onContinue: () => void;
}

export default function RecallModal({ passage, result, echoPlan, isLast, onSubmit, onContinue }: RecallModalProps) {
  const [answer, setAnswer] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (answer.trim() === '') {
      setTouched(true);
      return;
    }
    onSubmit(answer.trim());
  };

  const continueLabel = echoPlan ? 'Start Echo Review' : isLast ? 'Finish the book' : 'Next page';

  return (
    <Modal labelledBy="recall-title" describedBy="recall-prompt">
      <p className="modal-kicker">Recall · {passage.title}</p>
      <h2 id="recall-title" className="modal-title">Quick recall</h2>
      <p id="recall-prompt" className="recall-prompt">{passage.question.prompt}</p>

      {result === undefined ? (
        <form onSubmit={submit} noValidate>
          <label htmlFor="recall-answer" className="field-label">Your answer</label>
          <input
            id="recall-answer"
            className="field"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={touched && answer.trim() === ''}
            aria-describedby={touched && answer.trim() === '' ? 'recall-error' : undefined}
          />
          {touched && answer.trim() === '' && (
            <p id="recall-error" className="field-error">Type a short answer from memory first.</p>
          )}
          <p className="modal-note">
            This checks what you understood, which is separate from how well you typed.
          </p>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">Check answer</button>
          </div>
        </form>
      ) : (
        <div>
          <p className={`feedback ${result.correct ? 'is-right' : 'is-wrong'}`} role="status">
            <span className="feedback-mark" aria-hidden="true">{result.correct ? '✓' : '✕'}</span>
            <span>
              <strong>{result.correct ? 'Recalled.' : 'Not quite.'}</strong>{' '}
              {result.correct
                ? 'That matches the passage.'
                : `The passage says: ${passage.question.modelAnswer}`}
            </span>
          </p>
          <p className="modal-note">Your answer: “{result.answer}”</p>
          <p className="modal-note">
            {echoPlan
              ? `Next up: an Echo Review on “${echoPlan.word}”.`
              : 'Nothing tripped you up on this page, so no Echo Review is needed.'}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={onContinue} autoFocus>
              {continueLabel}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
