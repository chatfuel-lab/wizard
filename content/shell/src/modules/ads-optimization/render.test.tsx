import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { AdsOptimizationApp } from './AdsOptimizationApp';

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
      <AdsOptimizationApp
        botId="bot-1"
        client={client}
        view=""
        setView={() => undefined}
        params={new URLSearchParams()}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );
    expect(html).toContain('Ads Optimization');
    /* The rail, through SplitPane's own aside. */
    expect(html).toContain('aria-label="Event sets"');
    /* The keyboard has to be findable without knowing it is there. */
    expect(html).toContain('aria-label="Open the command palette"');
    expect(html).toContain('New event set');
  });
});
