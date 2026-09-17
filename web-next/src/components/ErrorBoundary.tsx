'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import styles from './ErrorBoundary.module.scss';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

// React unmounts the whole tree when a render throws and nothing catches it,
// so before this existed a single bad value anywhere — a painting with no
// images, a locale key that wasn't a string — left the visitor looking at a
// white page with no explanation and no way forward.
//
// A class, because this is the one thing hooks still cannot do.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the console rather than sent anywhere: there is no error
    // reporting service wired up, and pretending otherwise would be worse than
    // saying so. The component stack is the useful half.
    console.error('Unhandled render error', error, info.componentStack);
  }

  // A full reload rather than clearing the error state: whatever broke is
  // probably in a store or a cache that re-rendering would hand straight back.
  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className={styles.shell} role="alert">
        <div className={styles.panel}>
          <p className={styles.eyebrow}>Viktorumm</p>
          <h1 className={styles.title}>Щось пішло не так</h1>
          <p className={styles.text}>
            Сторінка не змогла відмалюватися. Спробуйте перезавантажити — якщо
            це повториться, напишіть нам, і ми розберемося.
          </p>

          <div className={styles.actions}>
            <button type="button" onClick={this.reload} className={styles.button}>
              Перезавантажити
            </button>
            <a href="/ua" className={styles.link}>
              На головну
            </a>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <pre className={styles.details}>
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
