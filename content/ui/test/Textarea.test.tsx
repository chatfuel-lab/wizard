/* @vitest-environment jsdom */
import { act, createRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Textarea } from '../src/forms/Textarea';

/* React only runs its act() batching quietly when this flag is set, and warns
   on every call otherwise — there is no test runner here to set it for us. */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* jsdom never runs layout, so scrollHeight is always 0 — stubbed per test so
   the autoGrow effect has a real content height to measure against. */
function stubScrollHeight(px: number) {
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
    configurable: true,
    value: px,
  });
}

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(ui: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container.querySelector('textarea')!;
}

describe('Textarea ref merging', () => {
  it('hands the DOM node to a caller-supplied ref', () => {
    const externalRef = createRef<HTMLTextAreaElement>();
    const node = mount(<Textarea ref={externalRef} />);
    expect(externalRef.current).toBe(node);
  });

  it('keeps writing the autoGrow height when a caller ref is also attached', () => {
    stubScrollHeight(140);
    const externalRef = createRef<HTMLTextAreaElement>();
    const node = mount(<Textarea ref={externalRef} autoGrow rows={2} />);
    expect(externalRef.current).toBe(node);
    expect(node.style.height).toMatch(/^\d+px$/);
  });
});
