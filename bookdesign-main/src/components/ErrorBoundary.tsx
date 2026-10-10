import { Component } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEY } from '../lib/appState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** Last line of defence: a friendly recovery screen instead of a blank page on stage. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  private recover = (): void => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: a plain reload is still the best we can do.
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>KeyTurn hit an unexpected problem. Reset clears the saved demo and reloads so you can start fresh.</p>
        <button type="button" className="btn btn-primary" onClick={this.recover}>
          Reset demo and reload
        </button>
      </div>
    );
  }
}
