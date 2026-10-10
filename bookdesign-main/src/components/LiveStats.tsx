import { useEffect, useState } from 'react';
import type { PageStats } from '../types';
import { IDLE_MS, formatDuration } from '../lib/typingEngine';

interface LiveStatsProps {
  page: PageStats;
  pageNumber: number;
  totalPages: number;
  lastKeyAt: number | null;
  typingActive: boolean;
}

/** Compact typing stats that stay pinned on screen while the learner types. */
export default function LiveStats({ page, pageNumber, totalPages, lastKeyAt, typingActive }: LiveStatsProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!typingActive || lastKeyAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [typingActive, lastKeyAt]);

  let timer = 'Starts when you type';
  if (lastKeyAt !== null) {
    if (!typingActive) timer = 'Stopped';
    else timer = now - lastKeyAt > IDLE_MS ? 'Paused (idle)' : 'Running';
  }

  return (
    <section className="live-stats" aria-label="Live typing stats">
      <p className="live-page">
        Page {pageNumber} <span>of {totalPages}</span>
      </p>
      <dl className="live-list">
        <div className="live-main"><dt>Speed</dt><dd>{page.wpm}<small> WPM</small></dd></div>
        <div className="live-main"><dt>Accuracy</dt><dd>{page.accuracy}<small>%</small></dd></div>
        <div><dt>Mistyped</dt><dd>{page.mistakes}</dd></div>
        <div className="live-optional"><dt>Fixed</dt><dd>{page.fixed}</dd></div>
        <div><dt>Time</dt><dd>{formatDuration(page.activeMs)}</dd></div>
        <div><dt>Inked</dt><dd>{page.percent}<small>%</small></dd></div>
      </dl>
      <p className="live-timer">Timer: {timer}</p>
    </section>
  );
}
