import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  AttachmentTile,
  Button,
  FloatingDock,
  IconRefresh,
  SegmentedControl,
  TestChat,
  useTestChat,
  type Band,
  type TestChatAction,
  type TestChatTransport,
  Composer,
  ConversationListItem,
  MessageActions,
  MessageBubble,
  MessageList,
  MessageStatus,
  NavRail,
  Popover,
  SideNav,
  Switch,
  SystemLine,
  Tag,
  ThemeToggle,
  ThreadHeader,
  Topbar,
  TypingIndicator,
  highlightRanges,
  matchRanges,
  type AttachmentKind,
  type AttachmentState,
  type ComposerApi,
  type MessageListApi,
} from '~ui';
import * as Icons from '~ui/icons';
import { Demo, Note, Row } from './shared';

const STATUSES: MessageStatus[] = ['sending', 'sent', 'delivered', 'read', 'failed'];

/* The shell's real three groups, with the shell's real titles — the gallery is
   where this layout gets reviewed, so a made-up menu would review nothing. */
const DEMO_GROUPS = [
  {
    id: 'ai',
    title: 'AI Agent',
    icon: <Icons.IconSparkles />,
    items: [
      { id: 'automations', title: 'Automations', icon: <Icons.IconBolt /> },
      { id: 'flow-builder', title: 'Flow Builder', icon: <Icons.IconFlow /> },
      { id: 'knowledge-base', title: 'Knowledge Base', icon: <Icons.IconBook /> },
    ],
  },
  {
    id: 'chat',
    title: 'Live Chat',
    icon: <Icons.IconInbox />,
    items: [
      { id: 'livechat', title: 'Inbox', icon: <Icons.IconInbox /> },
      { id: 'coworker', title: 'Coworker', icon: <Icons.IconSparkles /> },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: <Icons.IconUsers />,
    items: [
      { id: 'contacts', title: 'Contacts', icon: <Icons.IconContacts /> },
      { id: 'deals', title: 'Deals', icon: <Icons.IconKanban /> },
      { id: 'bookings', title: 'Bookings', icon: <Icons.IconCalendar /> },
    ],
  },
];

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

interface DemoMessage {
  id: string;
  at: number;
  direction: 'in' | 'out';
  text: string;
  status?: MessageStatus;
}

/* Seeded across three calendar days so the separators have something to
   separate, and with the unread anchor two from the end. */
function seedThread(): DemoMessage[] {
  const now = Date.now();
  return [
    { id: 'm1', at: now - 2 * DAY, direction: 'in', text: 'Hi — is the WhatsApp number already connected?' },
    { id: 'm2', at: now - 2 * DAY + 3 * MINUTE, direction: 'out', text: 'Checking now.', status: 'read' },
    { id: 'm3', at: now - DAY, direction: 'out', text: 'It went live this morning.', status: 'read' },
    { id: 'm4', at: now - DAY + MINUTE, direction: 'in', text: 'Perfect. Can you also enable the away message?' },
    {
      id: 'm5',
      at: now - 40 * MINUTE,
      direction: 'out',
      text: 'Done — 6pm to 9am, weekends included.',
      status: 'delivered',
    },
    { id: 'm6', at: now - 20 * MINUTE, direction: 'in', text: 'One more thing…' },
    { id: 'm7', at: now - 19 * MINUTE, direction: 'in', text: 'Could the away message mention the new pricing page?' },
  ];
}

const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const ATTACHMENTS: { kind: AttachmentKind; name: string; meta: string }[] = [
  { kind: 'image', name: 'pricing-page.png', meta: '412 KB' },
  { kind: 'video', name: 'walkthrough.mp4', meta: '0:42' },
  { kind: 'audio', name: 'voice-note.ogg', meta: '0:14' },
  { kind: 'document', name: 'setup-summary-final-v3.pdf', meta: '1.2 MB' },
];

const ATTACHMENT_STATES: AttachmentState[] = ['ready', 'uploading', 'failed'];

interface DemoConversation {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  unreadCount?: number;
  muted?: boolean;
  assignee?: { name: string } | null;
  meta: string;
}

const CONVERSATIONS: DemoConversation[] = [
  {
    id: 'c1',
    name: 'Ada Lovelace',
    preview: 'Could the away message mention the new pricing page?',
    timestamp: '14:03',
    unreadCount: 2,
    assignee: { name: 'Grace H.' },
    meta: 'WhatsApp · wants a human',
  },
  {
    id: 'c2',
    name: 'Bruno Latour',
    preview: 'Thanks, that worked!',
    timestamp: '11:40',
    assignee: { name: 'You' },
    meta: 'Instagram · open',
  },
  {
    id: 'c3',
    name: 'Chidi Anagonye',
    preview: '📷 Photo',
    timestamp: 'Aug 11',
    unreadCount: 14,
    muted: true,
    meta: 'Web · automated',
  },
  {
    id: 'c4',
    name: 'Dae-jung Kim',
    preview: 'No messages yet',
    timestamp: 'Aug 9',
    assignee: null,
    meta: 'Facebook · closed',
  },
];

/* ── the test chat, and the window it lives in ───────────────────────────── */

interface DemoSession {
  conversationID: string;
  startedAt: string;
}

/** A message on the demo's own "wire" — the shape a module's `toRow` maps from. */
interface DemoNode {
  key: string;
  from: 'bot' | 'me';
  text: string;
  at: number;
  actions?: TestChatAction[];
  system?: boolean;
}

let demoSeq = 0;
const demoNode = (from: DemoNode['from'], text: string, extra: Partial<DemoNode> = {}): DemoNode => {
  demoSeq += 1;
  return { key: `demo-${demoSeq}`, from, text, at: Date.now(), ...extra };
};

const OPENING = (): DemoNode =>
  demoNode('bot', 'Hi! I\u2019m the Luma Skin Studio assistant. What can I do for you?', {
    actions: [
      { kind: 'button', title: 'Book a visit', click: 'continue' },
      { kind: 'button', title: 'Prices', click: 'continue' },
      { kind: 'button', title: 'Our treatments', href: 'https://example.com' },
    ],
  });

function demoReply(said: string): DemoNode {
  const t = said.toLowerCase();
  if (/(human|agent|manager)/.test(t)) {
    return demoNode('bot', 'The flow handed this chat to an operator', { system: true });
  }
  if (/(price|cost)/.test(t)) {
    return demoNode(
      'bot',
      'Hydrafacial \u20ac120 (60 min), microneedling \u20ac180 (45 min), LED therapy \u20ac60 (30 min).',
    );
  }
  if (/^(thu|fri)/.test(t)) return demoNode('bot', `Booked \u2014 ${said}. You\u2019ll get a reminder the day before.`);
  return demoNode('bot', 'The two nearest free slots are:', {
    actions: [
      { kind: 'button', title: 'Thu 17:00', click: 'continue' },
      { kind: 'button', title: 'Fri 11:30', click: 'continue' },
    ],
  });
}

/**
 * The dock over a canvas, with the whole state machine behind it.
 *
 * The transport is the seam: five functions, resolved from timers instead of a
 * network, and everything above them — the generation guard, subscribe-then-load,
 * the optimistic row, the restart watermark — is the same code the flow builder
 * and Automations run in production.
 */
function TestChatDemo() {
  const [open, setOpen] = useState(true);
  const [size, setSize] = useState({ width: 340, height: 420 });
  const [band, setBand] = useState<Band>('wide');
  const push = useRef<((nodes: DemoNode[]) => void) | null>(null);

  const answer = useCallback((said: string) => {
    window.setTimeout(() => push.current?.([demoReply(said)]), 700);
  }, []);

  const transport = useMemo<TestChatTransport<DemoSession, DemoNode>>(
    () => ({
      targetKey: 'demo-flow',
      errorMessage: (err, fallback = 'Something went wrong.') => (err instanceof Error ? err.message : fallback),
      toRow: (node) => ({
        id: node.key,
        key: node.key,
        kind: node.system ? 'system' : node.from === 'bot' ? 'out' : 'in',
        systemKind: node.system ? 'handoff' : undefined,
        text: node.text,
        actions: node.actions,
        sentTime: new Date(node.at).toISOString(),
        at: node.at,
        updatedAt: new Date(node.at).toISOString(),
        senderLabel: node.from === 'bot' ? 'Luma' : 'You (test)',
        fromBot: node.from === 'bot',
        supported: true,
      }),
      start: async () => {
        window.setTimeout(() => push.current?.([OPENING()]), 500);
        return { conversationID: `demo-${Date.now()}`, startedAt: new Date().toISOString() };
      },
      loadPage: async () => [],
      subscribe: (_session, handlers) => {
        push.current = (nodes) => handlers.next(nodes);
        return () => {
          push.current = null;
        };
      },
      sendText: async (_session, text) => {
        if (/\bfail\b/i.test(text)) throw new Error('The server could not handle that.');
        answer(text);
        return demoNode('me', text);
      },
      sendAction: async (_session, _row, action) => {
        answer(action.title);
        return demoNode('me', action.title);
      },
    }),
    [answer],
  );

  const chat = useTestChat(transport);

  return (
    <div className="space-y-2">
      <Row label="Band">
        <SegmentedControl
          aria-label="Container band"
          value={band}
          onChange={(next) => setBand(next as Band)}
          options={[
            { value: 'compact', label: 'compact' },
            { value: 'narrow', label: 'narrow' },
            { value: 'wide', label: 'wide' },
          ]}
        />
        <span className="text-xs text-text-muted">Below `narrow` the dock is a bottom drawer.</span>
      </Row>
      <div className="canvas-grid relative h-[28rem] overflow-hidden rounded-card border border-border bg-canvas">
        <div className="absolute left-3 top-3">
          <Tag>Welcome flow</Tag>
        </div>
        <FloatingDock
          open={open}
          onOpenChange={setOpen}
          label="Test"
          active={chat.session !== null}
          size={size}
          onSizeChange={setSize}
          band={band}
          inlineFrom="narrow"
          title={<span className="truncate text-sm font-semibold text-text">Test</span>}
          actions={
            chat.session ? (
              <Button iconOnly variant="ghost" size="sm" aria-label="Restart the test" onClick={chat.restart}>
                <IconRefresh size={14} />
              </Button>
            ) : null
          }
        >
          <TestChat
            status={chat.status}
            rows={chat.rows}
            typing={chat.typing}
            error={chat.error}
            threadError={chat.threadError}
            threadLoading={chat.threadLoading}
            threadKey={chat.session?.conversationID ?? 'idle'}
            botName="Welcome flow"
            canSend={chat.ready}
            onSend={chat.send}
            onStart={chat.start}
            onAction={chat.act}
            canStart
            emptyTitle="Welcome flow"
            compact
          />
        </FloatingDock>
      </div>
    </div>
  );
}

export function ChatShellSection() {
  const [navId, setNavId] = useState('inbox');
  const [moduleId, setModuleId] = useState('deals');
  const [sent, setSent] = useState<string | null>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const composer = useRef<ComposerApi>(null);

  return (
    <div className="space-y-4">
      <Demo name="Test chat" tokens="FloatingDock · Island · rounded-island / shadow-island / z-island · TestChat">
        <Note>
          The surface a bot is tested on, and the window it floats in over a canvas. Press Start, then press the buttons
          — in a test the reader IS the contact, so buttons act instead of being a transcript, and an inbound message
          renders on the right. Type <code>fail</code> for the refused-send bubble, <code>human</code> for the hand-off
          that closes the composer. Drag the top-left corner to resize; collapsing keeps the conversation, which is what
          the dot on the pill says.
        </Note>
        <TestChatDemo />
      </Demo>

      <Demo name="Chat" tokens="bubble-in / bubble-out (+fg) · rounded-bubble · surface-sunken system line">
        <div className="max-w-md space-y-2 rounded-lg bg-surface p-3">
          <SystemLine>Conversation started · today 10:24</SystemLine>
          <MessageBubble direction="in" senderName="Ada" time="10:24">
            Hi — is the WhatsApp number already connected?
          </MessageBubble>
          <MessageBubble direction="out" time="10:25" status="read">
            Yes, it went live this morning.
          </MessageBubble>
          <TypingIndicator />
          <MessageBubble direction="out" time="10:26" status="failed" error="Network error">
            Want me to send the setup summary?
          </MessageBubble>
          <MessageBubble
            direction="out"
            time="10:27"
            status="delivered"
            actions={
              <MessageActions
                actions={[
                  { title: 'Yes, send it' },
                  { title: 'Not now' },
                  { title: 'Open the guide', href: 'https://docs.chatfuel.com' },
                  { title: 'Call us', phone: '+1 555 0100' },
                ]}
              />
            }
          >
            Reply buttons and links live under the bubble, at its width, before the time.
          </MessageBubble>
          <MessageBubble
            direction="out"
            time="10:28"
            status="read"
            actions={
              <MessageActions
                actions={[
                  { kind: 'row', title: 'Standard', description: '2–3 business days' },
                  { kind: 'row', title: 'Express', description: 'Next day' },
                  { kind: 'row', title: 'Pick up in store' },
                ]}
              />
            }
          >
            Which shipping option would you like?
          </MessageBubble>
        </div>
        <Note>
          <code>MessageActions</code> is a transcript in an inbox — a plain button has no handler and no hover, because
          the contact presses it, not the operator; a link and a phone stay live for everyone. Pass{' '}
          <code>onSelect</code> on a preview surface where the reader is the contact.
        </Note>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-text-muted">Outgoing status icons:</p>
          <div className="max-w-md space-y-1">
            {STATUSES.map((status) => (
              <MessageBubble key={status} direction="out" time="10:30" status={status}>
                status=&quot;{status}&quot;
              </MessageBubble>
            ))}
          </div>
        </div>
      </Demo>

      <Demo name="MessageStatus" tokens="text-accent read · text-danger failed · everything else inherits">
        <Note>
          The glyph always carries its word in the accessibility tree, because two ticks versus two coloured ticks is
          not information to anyone who cannot separate the hues.
        </Note>
        <div className="flex flex-wrap items-center gap-4 text-text-faint">
          {STATUSES.map((status) => (
            <MessageStatus key={status} status={status} size={14} showLabel />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-text-faint">
          {STATUSES.map((status) => (
            <MessageStatus key={status} status={status} />
          ))}
        </div>
      </Demo>

      <ThreadDemo />
      <ConversationListDemo />
      <AssistantRailDemo />

      <Demo name="AttachmentTile" tokens="rounded-card · border-danger failed · Progress uploading">
        <Note>
          Two shapes, chosen by kind: an image or a video is a thumbnail because the content is the identifier, a
          document or a voice note is a row because its name is. A failed upload keeps its place and its name so the
          retry has something to retry.
        </Note>
        <div className="space-y-4">
          {ATTACHMENT_STATES.map((state) => (
            <div key={state}>
              <p className="mb-2 font-mono text-micro text-text-faint">state=&quot;{state}&quot;</p>
              <div className="flex flex-wrap items-start gap-3">
                {ATTACHMENTS.map((attachment) => (
                  <AttachmentTile
                    key={attachment.name}
                    kind={attachment.kind}
                    name={attachment.name}
                    meta={attachment.meta}
                    state={state}
                    progress={state === 'uploading' ? 62 : undefined}
                    error={state === 'failed' ? 'Upload failed' : undefined}
                    onOpen={state === 'ready' ? () => {} : undefined}
                    onRetry={state === 'failed' ? () => {} : undefined}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Demo>

      <Demo name="Composer" tokens="border-border · accent send · text-faint disabled hint">
        <Note>
          <code>disabled</code> and <code>sending</code> are different states: the first greys the whole surface and
          says why, the second greys only the button. The textarea grows to its own <code>max-h-32</code> and then
          scrolls — paste a paragraph into it. The smiley is
          <code>ref.insert</code>: type something, put the caret in the middle, click it — the emoji lands at the caret
          and the caret ends up after it. Select a word first and it replaces the word.
          <br />
          <br />
          <strong>Compact</strong> is what a module passes on a 360px thread, where three icons in the slot plus attach
          and send left the textarea a few characters wide: the slot folds behind one &ldquo;+&rdquo; and opens in a
          popover. The module says when — it knows its band, <code>~ui</code> does not measure. Open it, open{' '}
          <em>Saved replies</em> inside it, pick one: <code>ref.insert</code> still lands at the caret, the reply
          popover sits above the &ldquo;+&rdquo; popover rather than dismissing it (the layer stack knows which came
          later), and after the pick focus stays in the textarea instead of being yanked back to the button.
        </Note>
        <div className="mb-3">
          <Switch checked={compact} onChange={setCompact} label="Compact — the 360px thread" />
        </div>
        {/* 360 wide when compact — the phone the prop exists for — so the
            squeeze it fixes is visible; a comfortable width otherwise. */}
        <div className="max-w-md space-y-3" style={compact ? { width: 360 } : undefined}>
          <Composer
            ref={composer}
            onSend={(text) => setSent(text)}
            onAttach={() => {}}
            compact={compact}
            leftSlot={
              <>
                <Button
                  iconOnly
                  variant="ghost"
                  aria-label="Insert an emoji"
                  onClick={() => composer.current?.insert('🙂')}
                >
                  <span aria-hidden>🙂</span>
                </Button>
                <Popover
                  aria-label="Saved replies"
                  placement="top-start"
                  trigger={(props) => (
                    <Button {...props} iconOnly variant="ghost" aria-label="Saved replies">
                      <Icons.IconBook />
                    </Button>
                  )}
                >
                  <div className="flex flex-col gap-1">
                    {['Thanks for reaching out!', 'One moment while I check.'].map((reply) => (
                      <Button
                        key={reply}
                        size="sm"
                        variant="ghost"
                        className="justify-start"
                        onClick={() => composer.current?.insert(reply)}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </Popover>
                <Button iconOnly variant="ghost" aria-label="Send a template">
                  <Icons.IconLayoutList />
                </Button>
              </>
            }
          />
          {sent ? <p className="text-xs text-text-muted">Last sent: {sent}</p> : null}
          <Composer onSend={() => {}} leftSlot={<Icons.IconSparkles className="text-text-faint" />} sending />
          <Composer onSend={() => {}} disabled disabledHint="24-hour window closed" />
        </div>
        <Note>
          <code>onStop</code> is the assistant&rsquo;s third state, and it REPLACES the send button rather than sitting
          beside it: while an agent loop is running there is exactly one thing worth doing, and a stop button added next
          to a greyed-out send is two controls where the useful one is the new and smaller half. It stays live through{' '}
          <code>sending</code> and through <code>disabled</code> — a run in flight is precisely when the composer is
          busy, and somebody who has lost permission to write can still want the thing they started to end. Enter sends
          nothing while it is offered: Enter is muscle memory, and a draft sent into a running loop is an implicit
          rejection of whatever the assistant was about to ask approval for. Type something and press Enter — the text
          stays in the box.
        </Note>
        <div className="mt-3 max-w-md space-y-3">
          <Composer
            onSend={() => {}}
            onStop={() => setStopped(new Date().toLocaleTimeString())}
            placeholder="The assistant is working…"
          />
          <Composer onSend={() => {}} onStop={() => {}} stopping placeholder="Stopping…" />
          {stopped ? <p className="text-xs text-text-muted">onStop fired at {stopped}</p> : null}
        </div>
      </Demo>

      <Demo name="AppShell · Topbar · NavRail" tokens="surface page · surface-raised chrome · accent-soft active rail">
        <div className="h-72 overflow-hidden rounded-lg border border-border">
          <AppShell
            nav={
              <NavRail
                items={[
                  { id: 'inbox', title: 'Live chat', icon: <Icons.IconInbox /> },
                  { id: 'contacts', title: 'Contacts', icon: <Icons.IconContacts /> },
                  { id: 'flows', title: 'Flows', icon: <Icons.IconFlow /> },
                  { id: 'deals', title: 'Deals', icon: <Icons.IconKanban /> },
                ]}
                activeId={navId}
                onSelect={setNavId}
              />
            }
            topbar={
              /* The bar names the product and the bot, never the active module
                 — "Live chat" is the rail's job, and the module's own
                 PageHeader says it a second time for the embed case. */
              <Topbar
                title="Acme Support"
                workspace={<Tag>Support bot</Tag>}
                right={
                  <>
                    <ThemeToggle />
                    <Button size="sm">Invite</Button>
                  </>
                }
              />
            }
          >
            <div className="p-4 text-sm text-text-muted">Active rail item: {navId}</div>
          </AppShell>
        </div>
      </Demo>

      <Demo
        name="AppShell · SideNav (grouped)"
        tokens="w-rail groups · w-nav-panel items · accent-soft active · accent dot = the section you are in"
      >
        <Note>
          Hovering a group opens its items beside the rail and navigates nowhere — the address bar still says{' '}
          <code> /&lt;moduleId&gt;</code>. The flyout is positioned, not laid out, so the nav costs one rail and the
          module keeps the rest. Click toggles it too, because a touch screen has no hover; Escape closes it; Tab off a
          group icon lands in that group&rsquo;s items. One group left (a scaffold that installed one area) drops the
          grouping and renders the flat rail this shell had before.
        </Note>
        <div className="h-80 overflow-hidden rounded-lg border border-border">
          <AppShell
            nav={<SideNav groups={DEMO_GROUPS} activeId={moduleId} onSelect={setModuleId} />}
            navDrawer={<SideNav groups={DEMO_GROUPS} activeId={moduleId} onSelect={setModuleId} variant="expanded" />}
            navCollapsedBelow="never"
            topbar={<Topbar workspace={<Tag>Support bot</Tag>} right={<ThemeToggle />} />}
          >
            <div className="p-4 text-sm text-text-muted">Active module: {moduleId}</div>
          </AppShell>
        </div>
        <p className="text-xs text-text-muted">The drawer copy — every group stacked, one column, nothing to hover:</p>
        <div className="h-80 w-56 overflow-y-auto rounded-lg border border-border bg-surface-raised">
          <SideNav groups={DEMO_GROUPS} activeId={moduleId} onSelect={setModuleId} variant="expanded" />
        </div>
      </Demo>
    </div>
  );
}

/**
 * The whole thread, wired: the header, the virtualized list and the composer,
 * with the three behaviours that only show up when you push them.
 */
function ThreadDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>(seedThread);
  const [typing, setTyping] = useState(false);
  const [staged, setStaged] = useState<string[]>([]);
  const [olderPages, setOlderPages] = useState(0);
  /* The other half of "the list never moves the reader against their will": a
     thread that refuses to jump owes them a way to jump themselves. */
  const list = useRef<MessageListApi>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);

  const receive = () => {
    if (!atBottom) setMissed((count) => count + 1);
    setMessages((current) => [
      ...current,
      {
        id: `in-${current.length}-${Date.now()}`,
        at: Date.now(),
        direction: 'in',
        text: 'And one more — the pricing page link, please.',
      },
    ]);
  };

  const loadOlder = () => {
    setOlderPages((pages) => pages + 1);
    setMessages((current) => {
      const oldest = current[0]?.at ?? Date.now();
      const page = Array.from({ length: 12 }, (_, index) => ({
        id: `older-${olderPages}-${index}`,
        at: oldest - (12 - index) * 5 * MINUTE,
        direction: (index % 2 === 0 ? 'in' : 'out') as 'in' | 'out',
        text: `Older message ${12 - index} from page ${olderPages + 1}.`,
        status: 'read' as const,
      }));
      return [...page, ...current];
    });
  };

  return (
    <Demo
      name="ThreadHeader · MessageList · Composer"
      tokens="h-14 header · min-h-0 flex-1 scroller · accent unread rule"
    >
      <Note>
        Scroll up, then press <strong>Receive a message</strong>: the list must not move. Scroll back to the bottom and
        press it again: it follows. <strong>Load older</strong> prepends twelve messages and the view stays on the
        message you were reading. The unread rule is pinned to a message id, so neither of those moves it.
        <br />
        <br />
        The pill is the other half of that promise. A list that refuses to drag a reader down owes them a way to go
        themselves, and it is the only party that knows both facts a pill is made of: <code>onAtBottomChange</code> says
        whether the newest message is on screen, and <code>ref.scrollToBottom(&apos;smooth&apos;)</code> takes them
        there and re-arms following. Note what <code>onAtBottomChange</code> is not: stickiness un-latches the moment
        you scroll up by a pixel, on purpose, while &ldquo;at the bottom&rdquo; is the plainer geometric question —
        nudge up thirty pixels and no pill appears, because you can still see the newest message.
      </Note>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={receive}>
          Receive a message
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setTyping((on) => !on)}>
          {typing ? 'Stop typing' : 'Show typing'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMessages(seedThread())}>
          Reset
        </Button>
        <span className="text-micro text-text-faint">{messages.length} messages</span>
      </div>

      <div className="flex h-96 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <ThreadHeader
          name="Ada Lovelace"
          platform="WhatsApp"
          status="open"
          assignee={{ name: 'Grace Hopper' }}
          onAssigneeClick={() => {}}
          onBack={() => {}}
          actions={
            <Button size="sm" variant="ghost">
              Take over
            </Button>
          }
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <MessageList
            ref={list}
            items={messages}
            threadKey="ada"
            firstUnreadId="m6"
            estimateItemHeight={56}
            onAtBottomChange={(at) => {
              setAtBottom(at);
              if (at) setMissed(0);
            }}
            onReachTop={olderPages < 3 ? loadOlder : undefined}
            header={
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={loadOlder}
                  className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover"
                >
                  Load older messages
                </button>
              </div>
            }
            footer={
              typing ? (
                <div className="py-1">
                  <TypingIndicator />
                </div>
              ) : null
            }
            renderItem={(message) => (
              <MessageBubble direction={message.direction} time={TIME.format(message.at)} status={message.status}>
                {message.text}
              </MessageBubble>
            )}
          />
          {atBottom ? null : (
            <button
              type="button"
              onClick={() => list.current?.scrollToBottom('smooth')}
              className="absolute bottom-3 left-1/2 z-sticky flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-inverse px-3 py-1.5 text-micro font-medium text-text-inverse shadow-overlay transition-colors duration-fast ease-standard focus-visible:focus-ring"
            >
              {missed > 0 ? `${missed} new ${missed === 1 ? 'message' : 'messages'}` : 'Jump to latest'}
              <Icons.IconChevronDown size={12} />
            </button>
          )}
        </div>

        <Composer
          onSend={(text) => {
            setStaged([]);
            setMessages((current) => [
              ...current,
              {
                id: `out-${current.length}-${Date.now()}`,
                at: Date.now(),
                direction: 'out',
                text: text || 'Sent an attachment',
                status: 'sent',
              },
            ]);
          }}
          onAttach={(files) => setStaged((current) => [...current, ...files.map((file) => file.name)])}
          attachmentCount={staged.length}
          attachments={
            staged.length > 0
              ? staged.map((name, index) => (
                  <AttachmentTile
                    key={`${name}-${index}`}
                    kind="document"
                    name={name}
                    meta="staged"
                    onRemove={() => setStaged((current) => current.filter((_, at) => at !== index))}
                  />
                ))
              : null
          }
        />
      </div>
    </Demo>
  );
}

function ConversationListDemo() {
  const [selectedId, setSelectedId] = useState('c1');

  return (
    <Demo name="ConversationListItem" tokens="row-selected · row-hover · Badge tone muted · text-nano assignee chip">
      <Note>
        Three lines at most, because the row height is what decides how much of an inbox fits on a screen. A muted
        conversation keeps its count and loses its colour — the reader asked not to be pulled towards it, not to be kept
        in the dark.
      </Note>
      <div className="w-list max-w-full overflow-hidden rounded-lg border border-border bg-surface-raised">
        {CONVERSATIONS.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            name={conversation.name}
            preview={conversation.preview}
            timestamp={conversation.timestamp}
            unreadCount={conversation.unreadCount}
            muted={conversation.muted}
            assignee={conversation.assignee}
            meta={conversation.meta}
            selected={selectedId === conversation.id}
            onSelect={() => setSelectedId(conversation.id)}
          />
        ))}
      </div>
    </Demo>
  );
}

/* Titles as the coworker rail gets them: server-generated from the first user
   message, sometimes a whole sentence, and sometimes the literal string
   "null". */
const ASSISTANT_CHATS = [
  { id: 'a1', title: 'Add a colour consultation service', preview: 'Created "Colour consultation".' },
  { id: 'a2', title: 'How is my pipeline doing this week?', preview: 'Three deals moved to Won.' },
  { id: 'a3', title: 'Why did the welcome flow stop firing?', preview: 'The trigger was paused on Aug 9.' },
  { id: 'a4', title: 'Untitled chat', preview: 'No messages yet' },
];

function AssistantRailDemo() {
  const [selectedId, setSelectedId] = useState('a1');
  const [query, setQuery] = useState('col');

  return (
    <Demo
      name="ConversationListItem — an assistant's rail"
      tokens="name: ReactNode · avatar={false} · bg-accent-soft mark"
    >
      <Note>
        The same row, with the two things an inbox of people wants and a chat with software does not. <code>name</code>{' '}
        takes a node, so the ranges the rail's own matcher found can be underlined instead of computed and thrown away —
        ranking was all a search bought before this. <code>avatar</code> takes <code>false</code>, because the
        alternative is a coloured circle holding the initials of a server-generated sentence: "How is my pipeline doing
        this week?" becomes a purple <strong>HI</strong>, which is decoration that reads as data. Every caller that
        passes a string and leaves the avatar alone is unchanged.
      </Note>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-micro text-text-muted" htmlFor="rail-query">
          Search
        </label>
        <input
          id="rail-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 rounded-control border border-border bg-surface px-2 text-xs text-text focus-visible:focus-ring"
        />
      </div>
      <div className="w-list max-w-full overflow-hidden rounded-lg border border-border bg-surface-raised">
        {ASSISTANT_CHATS.map((chat) => {
          const ranges = query.trim() === '' ? [] : (matchRanges(chat.title, query.trim()) ?? []);
          return (
            <ConversationListItem
              key={chat.id}
              name={highlightRanges(chat.title, ranges).map((segment, index) =>
                segment.match ? (
                  <mark key={index} className="rounded-[2px] bg-accent-soft text-accent">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
              avatar={false}
              preview={chat.preview}
              timestamp="14:03"
              selected={selectedId === chat.id}
              onSelect={() => setSelectedId(chat.id)}
            />
          );
        })}
      </div>
    </Demo>
  );
}
