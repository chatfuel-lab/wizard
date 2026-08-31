import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { ModuleRoot } from '~ui';
import { CoworkerContext, type CoworkerContextValue } from './CoworkerContext';
import { CoworkerWorkspace } from './CoworkerWorkspace';
import type { CoworkerRuntime } from './lib/runtime';

/**
 * The white-screen guard.
 *
 * The suite here runs without a browser, so nothing else in the repo can see a
 * component that throws on its first render - it type-checks, it passes every
 * gate, and it renders nothing. Rendering the tree to a string needs no DOM:
 * effects do not run, so what this asserts is the frame around the data, which
 * is exactly the part a broken component takes down with it.
 *
 * Deliberately NOT `renderToStaticMarkup(<CoworkerApp …/>)`, which is what the
 * other modules assert: `CoworkerApp` acquires its runtime in an effect and
 * renders a bare spinner until one exists, so the app entry has no frame to
 * assert on the first render. The workspace below the provider is where the
 * frame lives, so the test provides the context by hand — the same shape
 * `CoworkerApp` builds — with a runtime stub whose subscriptions nothing ever
 * opens, because effects do not run here.
 */

const never = () => () => undefined;

function stubRuntime(client: CoworkerContextValue['client'], botId: string): CoworkerRuntime {
  return {
    botId,
    client,
    bus: { onEvent: never, onCreated: never, onReconnect: never, onError: never },
    setShell: () => undefined,
    hasShell: () => false,
    setVisibleConversation: () => undefined,
    runDeferred: () => undefined,
    outcome: () => undefined,
    onOutcome: never,
  };
}

describe('the module renders', () => {
  it('mounts, and draws its frame before any data arrives', () => {
    const client = createTestClient();
    const botId = 'bot-1';
    const runtime = stubRuntime(client, botId);
    const html = renderToStaticMarkup(
      <CoworkerContext.Provider value={{ client, botId, events: runtime.bus, runtime }}>
        <ModuleRoot>
          <CoworkerWorkspace params={new URLSearchParams()} setParams={() => undefined} />
        </ModuleRoot>
      </CoworkerContext.Provider>,
    );
    expect(html).toContain('Coworker');
    expect(html).toContain('aria-label="Search your chats"');
    /* The keyboard has to be findable without knowing it is there. */
    expect(html).toContain('aria-label="Open the command palette"');
    /* No `?c=` at mount, so the detail pane is the empty thread and its box. */
    expect(html).toContain('What can I help you with?');
  });
});
