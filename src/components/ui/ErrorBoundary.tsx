import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  reset = () => {
    this.setState({ failed: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <p className="eyebrow">Something went wrong</p>
        <p className="mt-2 text-base font-semibold text-ink-950">This page couldn't be displayed</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Your data is safe. Try loading the page again, or pick another section from the menu.
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-primary" onClick={this.reset}>
            Try again
          </button>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
