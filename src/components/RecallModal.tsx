import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EchoPlan, Passage, RecallQuestion, RecallResult } from '../types';
import { checkRecallAnswer } from '../lib/recall';
import Modal from './Modal';

interface RecallModalProps {
  passage: Passage;
  questions: RecallQuestion[];
  result: RecallResult | undefined;
  echoPlan: EchoPlan | null;
  isLast: boolean;
  onSubmit: (answer: string, correct: boolean, concept: string | undefined, correctCount: number, totalQuestions: number) => void;
  onContinue: () => void;
}

export default function RecallModal({ passage, questions, result, echoPlan, isLast, onSubmit, onContinue }: RecallModalProps) {
  const [answer, setAnswer] = useState('');
  const [touched, setTouched] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ answer: string; correct: boolean; concept: string }>>([]);
  const question = questions[questionIndex] ?? questions[0] ?? passage.question;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (answer.trim() === '') {
      setTouched(true);
      return;
    }
    const checked = { answer: answer.trim(), correct: checkRecallAnswer(answer.trim(), question.accepted), concept: question.concept };
    const allAnswers = [...answers, checked];
    if (questionIndex < questions.length - 1) {
      setAnswers(allAnswers);
      setQuestionIndex((index) => index + 1);
      setAnswer('');
      setTouched(false);
      return;
    }
    const correctCount = allAnswers.filter((item) => item.correct).length;
    const missedConcept = allAnswers.find((item) => !item.correct)?.concept;
    onSubmit(
      allAnswers.map((item, index) => `Q${index + 1}: ${item.answer}`).join(' | '),
      correctCount === allAnswers.length,
      missedConcept,
      correctCount,
      allAnswers.length,
    );
  };

  const continueLabel = echoPlan ? 'Start Echo Review' : isLast ? 'Finish the book' : 'Next page';
  const totalQuestions = result?.totalQuestions ?? (result?.correctCount === undefined ? 1 : questions.length);
  const correctCount = result?.correctCount ?? (result?.correct ? totalQuestions : 0);

  return (
    <Modal labelledBy="recall-title" describedBy="recall-prompt">
      <p className="modal-kicker">Recall · {passage.title}</p>
      <h2 id="recall-title" className="modal-title">Quick recall</h2>
      {result === undefined ? (
        <>
          <p className="modal-note">Question {questionIndex + 1} of {questions.length}</p>
          <p id="recall-prompt" className="recall-prompt">{question.prompt}</p>
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
            <p className="modal-note">This checks what you understood, separately from how well you typed.</p>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">
                {questionIndex === questions.length - 1 ? 'Finish recall' : 'Next question'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div>
          <p className={`feedback ${result.correct ? 'is-right' : 'is-wrong'}`} role="status">
            <span className="feedback-mark" aria-hidden="true">{result.correct ? '✓' : '✕'}</span>
            <span>
              <strong>{correctCount} of {totalQuestions} recalled.</strong>{' '}
              {result.correct
                ? 'You answered every question correctly.'
                : 'Review the model answers and reinforce what you missed.'}
            </span>
          </p>
          <p className="modal-note">Your responses: {result.answer}</p>
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
