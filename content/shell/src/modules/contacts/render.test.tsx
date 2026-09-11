import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { ContactsApp } from './ContactsApp';
import { RecordActivity } from './components/record/RecordActivity';
import type { ContactMessagesApi } from './hooks/useContactMessages';

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
      <ContactsApp
        botId="bot-1"
        client={client}
        view=""
        setView={() => undefined}
        params={new URLSearchParams()}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );
    expect(html).toContain('Contacts');
    /* The keyboard has to be findable without knowing it is there. */
    expect(html).toContain('aria-label="Open the command palette"');
    expect(html).toContain('aria-label="Refresh"');
  });

  /* The record page itself cannot be rendered here with a contact in it: the
     test client never answers and effects do not run, so the page draws its
     loading frame whatever the contact would have been. The tab that shows the
     missing conversation takes its data as a prop, so this is the same
     assertion one level down. */
  it('offers a contact who has never messaged a way to start the conversation', () => {
    const api: ContactMessagesApi = {
      messages: [],
      conversation: null,
      loading: false,
      loadingOlder: false,
      error: null,
      hasOlder: false,
      loadOlder: () => undefined,
      reload: () => undefined,
    };
    const html = renderToStaticMarkup(
      <RecordActivity
        contactId="c-1"
        contactName="Anna Koch"
        api={api}
        onStartChat={() => undefined}
        chatStarted={false}
      />,
    );
    expect(html).toContain('No conversation yet');
    expect(html).toContain('Start a chat');
  });

  /* The button follows the conversation-aware link, which opens the thread a
     contact already has rather than starting anything — so the word on it is
     the link's. Hardcoded here, it promised to start a conversation and then
     opened an existing one. */
  it('says what the button will actually do for a contact who has a thread', () => {
    const api: ContactMessagesApi = {
      messages: [],
      conversation: null,
      loading: false,
      loadingOlder: false,
      error: null,
      hasOlder: false,
      loadOlder: () => undefined,
      reload: () => undefined,
    };
    const html = renderToStaticMarkup(
      <RecordActivity contactId="c-1" contactName="Anna Koch" api={api} onStartChat={() => undefined} chatStarted />,
    );
    expect(html).toContain('Open in Inbox');
    expect(html).not.toContain('Start a chat');
  });
});
