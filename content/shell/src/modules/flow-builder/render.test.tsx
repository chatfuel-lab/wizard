import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { FlowBuilderApp } from './FlowBuilderApp';

/**
 * The white-screen guard.
 *
 * The suite here runs without a browser, so nothing else in the repo can see a
 * component that throws on its first render - it type-checks, it passes every
 * gate, and it renders nothing. Rendering the tree to a string needs no DOM:
 * effects do not run, so what this asserts is the frame around the data, which
 * is exactly the part a broken component takes down with it.
 */
describe('the module renders', () => {
  it('mounts, and draws its frame before any data arrives', () => {
    const client = createTestClient();
    const html = renderToStaticMarkup(
      <FlowBuilderApp
        botId="bot-1"
        client={client}
        view=""
        setView={() => undefined}
        params={new URLSearchParams()}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );
    /* The rail, through SplitPane's own aside, and its search box. */
    expect(html).toContain('aria-label="Flows"');
    expect(html).toContain('aria-label="Find a flow"');
  });

  it('mounts the editor for a deep-linked flow and draws the loading canvas', () => {
    const client = createTestClient();
    const html = renderToStaticMarkup(
      <FlowBuilderApp
        botId="bot-1"
        client={client}
        view=""
        setView={() => undefined}
        params={new URLSearchParams('flow=flow-welcome')}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );
    /* Effects never run here, so the first frame is the skeleton: the editor
       chrome around the canvas, before any data arrives. */
    expect(html).toContain('Loading flow');
    expect(html).toContain('aria-busy="true"');
  });
});
