/* @vitest-environment jsdom */
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/feedback/ErrorBoundary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* React prints every caught render error to the console itself, and these tests
   throw on purpose — the noise would bury a real failure. */
let logged: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => {});
});

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  logged.mockRestore();
});

function mount(ui: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

function Boom({ message }: { message: string }): ReactElement {
  throw new Error(message);
}

function click(node: HTMLElement, text: string) {
  const button = [...node.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`no button saying "${text}" in: ${node.textContent}`);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

describe('ErrorBoundary', () => {
  it('keeps the page up when a child throws, and says what broke', () => {
    const node = mount(
      <div>
        <nav>The shell</nav>
        <ErrorBoundary label="Contacts">
          <Boom message="upstream said no" />
        </ErrorBoundary>
      </div>,
    );
    expect(node.querySelector('nav')?.textContent).toBe('The shell');
    expect(node.textContent).toContain('Contacts stopped working');
    expect(node.textContent).toContain('upstream said no');
  });

  it('reports the error to onError', () => {
    const onError = vi.fn();
    mount(
      <ErrorBoundary onError={onError}>
        <Boom message="reportable" />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('reportable');
  });

  it('builds the subtree again on retry, so a passing cause is a working screen', () => {
    let broken = true;
    function Flaky() {
      if (broken) throw new Error('the request failed');
      return <p>the module</p>;
    }
    const node = mount(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(node.textContent).toContain('the request failed');
    broken = false;
    click(node, 'Try again');
    expect(node.textContent).toContain('the module');
  });

  it('asks for a reload, not a retry, when the chunk is gone after a redeploy', () => {
    const node = mount(
      <ErrorBoundary>
        <Boom message="Failed to fetch dynamically imported module: /assets/contacts-a1b2.js" />
      </ErrorBoundary>,
    );
    expect(node.textContent).toContain('A new version is available');
    expect(node.textContent).not.toContain('Try again');
    expect(node.textContent).toContain('Reload the page');
  });

  it('hands the error and a way back to a caller-supplied fallback', () => {
    const node = mount(
      <ErrorBoundary fallback={(error) => <p>custom: {error.message}</p>}>
        <Boom message="mine to render" />
      </ErrorBoundary>,
    );
    expect(node.textContent).toBe('custom: mine to render');
  });
});
