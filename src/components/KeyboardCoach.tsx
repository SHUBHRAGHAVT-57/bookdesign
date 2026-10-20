import type { KeyMetrics } from '../lib/keyAnalytics';
import type { CSSProperties } from 'react';

const rows = ['Q W E R T Y U I O P', 'A S D F G H J K L', 'Z X C V B N M', 'Space'].map((row) => row.split(' '));

function rate(attempts: number, errors: number): number { return attempts ? Math.round((errors / attempts) * 100) : 0; }

export default function KeyboardCoach({ metrics }: { metrics: KeyMetrics }) {
  const ranked = Object.entries(metrics)
    .filter(([, metric]) => metric.attempts > 0)
    .sort((a, b) => rate(b[1].attempts, b[1].errors) - rate(a[1].attempts, a[1].errors) || b[1].attempts - a[1].attempts)
    .slice(0, 5);
  const totalAttempts = Object.values(metrics).reduce((sum, metric) => sum + metric.attempts, 0);
  const totalErrors = Object.values(metrics).reduce((sum, metric) => sum + metric.errors, 0);
  return <section className="insight-page" aria-labelledby="keyboard-title">
    <div className="insight-hero keyboard-hero"><p className="activity-eyebrow">KEYTURN · SKILL COACH</p><h2 id="keyboard-title">Keyboard heatmap</h2><p>Your difficult keys emerge from actual typing attempts. Start a passage to build this map — nothing here is simulated.</p></div>
    <div className="keyboard-summary">
      <article><span>Tracked attempts</span><strong>{totalAttempts.toLocaleString()}</strong></article>
      <article><span>Errors detected</span><strong>{totalErrors.toLocaleString()}</strong></article>
      <article><span>Accuracy</span><strong>{totalAttempts ? `${Math.round(((totalAttempts - totalErrors) / totalAttempts) * 100)}%` : '—'}</strong></article>
    </div>
    <div className="keyboard-layout" role="img" aria-label="Keyboard heatmap; darker red keys have a higher observed error rate">
      {rows.map((row, index) => <div className="keyboard-row" key={index}>{row.map((key) => {
        const metric = metrics[key] ?? { attempts: 0, errors: 0 };
        const errorRate = rate(metric.attempts, metric.errors);
        return <div className={`keycap ${key === 'Space' ? 'keycap-space' : ''}`} key={key} style={{ '--heat': Math.min(1, errorRate / 35) } as CSSProperties} title={`${key}: ${metric.attempts} attempts, ${metric.errors} errors`}><b>{key === 'Space' ? 'Space' : key}</b><small>{metric.attempts ? `${errorRate}% miss` : 'No data'}</small></div>;
      })}</div>)}</div>
    <section className="key-insights"><h3>Focus next</h3>{ranked.length ? <ol>{ranked.map(([key, metric]) => <li key={key}><strong>{key}</strong><span>{rate(metric.attempts, metric.errors)}% error rate across {metric.attempts} attempts</span></li>)}</ol> : <p>Type a few lines in the reading workspace and your personal focus keys will appear here.</p>}</section>
    <p className="local-note">Browser-local aggregate only: this records key names, attempts and errors — never your passage text or account information.</p>
  </section>;
}
