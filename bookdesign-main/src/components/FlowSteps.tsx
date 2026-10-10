import type { Phase } from '../types';

const STEPS = ['Read', 'Type', 'Recall', 'Review', 'Remember'] as const;

function activeIndex(phase: Phase): number {
  switch (phase) {
    case 'typing':
      return 1;
    case 'recall':
      return 2;
    case 'echo':
      return 3;
    case 'finished':
      return 4;
    default:
      return -1;
  }
}

export default function FlowSteps({ phase }: { phase: Phase }) {
  const active = activeIndex(phase);
  return (
    <ol className="flow" aria-label="Learning flow">
      {STEPS.map((label, index) => {
        const state = index === active ? 'current' : index < active ? 'done' : 'todo';
        return (
          <li key={label} className={`flow-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="flow-mark" aria-hidden="true">{state === 'done' ? '✓' : index + 1}</span>
            {label}
            {state === 'done' && <span className="visually-hidden"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
