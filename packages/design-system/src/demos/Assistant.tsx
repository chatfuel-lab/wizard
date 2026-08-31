import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  CodeBlock,
  JsonView,
  Markdown,
  RunGroup,
  RunStep,
  StreamingText,
  Switch,
  TOOL_FAMILY_ICONS,
  VoiceRecorder,
  describeTool,
  rollUpRunState,
  type RunState,
  type VoiceClip,
} from '~ui';
import { Demo, Note, Row } from './shared';

/* ------------------------------------------------------------------------ *
 * The payloads.
 *
 * Everything on this page is shaped like a realistic payload: the approval
 * batch, the four tool families, the markdown an answer is written in. A
 * gallery built on invented data reviews invented data.
 * ------------------------------------------------------------------------ */

const CREATE_SERVICE_ARGS = {
  botId: '000000000000000000000002',
  service: {
    title: 'Consultation',
    description:
      'A 45-minute call to scope the build: channels, the flows you already have, what the assistant should be allowed to do on its own, and what it must always ask about first.',
    durationSeconds: 2700,
    images: [],
    isAvailable: true,
    price: { amount: 12000, currency: 'USD' },
  },
};

const ANSWER = [
  '## Two services, one price change',
  '',
  'I found **3 services** on this bot. The `Consultation` one is the only one without a price,',
  'so I would set that first — everything else already reads correctly on the booking page.',
  '',
  '| Service | Duration | Price |',
  '| --- | --- | ---: |',
  '| Consultation | 45 min | *not set* |',
  '| Strategy call | 60 min | $250.00 |',
  '| Follow-up | 15 min | free |',
  '',
  '> Prices are stored in minor units, so $120.00 is `12000`.',
  '',
  'Here is what I am about to send:',
  '',
  '```json',
  '{ "service": { "title": "Consultation", "price": { "amount": 12000, "currency": "USD" } } }',
  '```',
  '',
  'Two things worth deciding first:',
  '',
  '1. whether the follow-up stays free',
  '   - it is the only one contacts book twice',
  '2. whether `isAvailable` should stay true while the price is missing',
  '',
  '---',
  '',
  'The full field list is in the [booking docs](https://docs.chatfuel.com/bookings).',
].join('\n');

const STEP_TOOLS = [
  { id: 'get_frontend_state', detail: 'Bookings · Services', state: 'done' as RunState, duration: 180 },
  { id: 'skill-booking_assistant_instr', detail: undefined, state: 'done' as RunState, duration: 640 },
  { id: 'chatfuel_gql-list_catalog', detail: '3 services', state: 'done' as RunState, duration: 1240 },
  {
    id: 'chatfuel_gql-create_service',
    detail: 'Consultation · $120.00',
    state: 'running' as RunState,
    duration: undefined,
  },
];

const ALL_STATES: RunState[] = ['running', 'done', 'failed', 'skipped'];

function toolIcon(id: string) {
  const Glyph = TOOL_FAMILY_ICONS[describeTool(id).family];
  return <Glyph />;
}

/* ------------------------------------------------------------------ markdown */

function MarkdownDemo() {
  const [compact, setCompact] = useState(false);
  return (
    <Demo name="Markdown" tokens="text-body · rounded-card table · accent link · surface-sunken inline code">
      <Note>
        Hand-rolled and zero-dependency, like the drag layer and the calendar before it — and the safer half of that
        trade: the popular renderers hand back an HTML string that has to be sanitised and injected, and one gap in the
        sanitiser is a script running in the dashboard on text a language model wrote. This produces a tree of plain
        objects, so there is no HTML anywhere and nothing to escape. Raw <code>&lt;b&gt;x&lt;/b&gt;</code> renders as
        those eight characters; a <code>javascript:</code> link renders as its own words with no target at all (
        <code>safeHref</code>, tested); an image renders as its alt text rather than fetching a URL the model chose.{' '}
        <strong>Compact</strong> is what the dock passes in its 320px column.
      </Note>
      <div className="mb-3">
        <Switch checked={compact} onChange={setCompact} label="Compact — the dock's column" />
      </div>
      <div className="rounded-card border border-border bg-surface p-3" style={compact ? { maxWidth: 340 } : undefined}>
        <Markdown text={ANSWER} compact={compact} />
      </div>
    </Demo>
  );
}

/* ----------------------------------------------------------------- streaming */

/* A stream shaped like the real one: a short answer arrives as hundreds of
   chunks, a handful of characters at a time in bursts, not a steady drip. */
function useFakeStream(source: string) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const replay = useCallback(() => {
    stop();
    setText('');
    setDone(false);
    let at = 0;
    timer.current = setInterval(() => {
      at += 1 + Math.floor(Math.random() * 9);
      if (at >= source.length) {
        setText(source);
        setDone(true);
        stop();
        return;
      }
      setText(source.slice(0, at));
    }, 40);
  }, [source, stop]);

  useEffect(() => {
    replay();
    return stop;
  }, [replay, stop]);

  return {
    text,
    done,
    replay,
    stop: () => {
      stop();
      setDone(true);
    },
  };
}

function StreamingDemo() {
  const stream = useFakeStream(ANSWER);
  const [asMarkdown, setAsMarkdown] = useState(true);
  const [settledAt, setSettledAt] = useState<string | null>(null);

  return (
    <Demo name="StreamingText" tokens="animate-caret · bg-text-muted caret · text-body">
      <Note>
        Chunks accumulate in a plain object; only a <code>requestAnimationFrame</code> loop sets state, so the ceiling
        is one render per frame however fast the socket talks — the module currently sets state per chunk, and a
        two-sentence reply re-renders the thread seventy times. The reveal is paced so a burst does not arrive as a
        slab, with a catch-up past a paragraph of backlog so a message that lands whole is not typed out for ten seconds
        afterwards. Under <code>prefers-reduced-motion</code> there is no pacing and no blink: the text appears and the
        caret stands still.
        <br />
        <br />
        The caret is passed to the renderer rather than positioned here, because only the renderer knows where the last
        word is — <code>Markdown</code> puts it inside its own last block through <code>trailing</code>, so it sits
        after the final character instead of on a line of its own. Watch the half-written <code>**bo</code> and the
        unclosed fence: neither ever restructures into something else when the next chunk lands.
      </Note>
      <Row>
        <Button size="sm" variant="secondary" onClick={stream.replay}>
          Replay
        </Button>
        <Button size="sm" variant="ghost" onClick={stream.stop}>
          Interrupt
        </Button>
        <Switch checked={asMarkdown} onChange={setAsMarkdown} label="Render as markdown" />
        {settledAt ? <span className="text-micro text-text-faint">onSettled fired at {settledAt}</span> : null}
      </Row>
      <div className="mt-3 rounded-card border border-border bg-surface p-3">
        <StreamingText
          text={stream.text}
          done={stream.done}
          onSettled={() => setSettledAt(new Date().toLocaleTimeString())}
          render={asMarkdown ? (visible, caret) => <Markdown text={visible} trailing={caret} /> : undefined}
        />
      </div>
    </Demo>
  );
}

/* ----------------------------------------------------------------- code block */

function CodeBlockDemo() {
  return (
    <Demo name="CodeBlock" tokens="surface-sunken · border-border-subtle rule · font-mono text-meta">
      <Note>
        No syntax highlighting, deliberately: a tokenizer per language is a dependency wearing a different hat, and its
        fallback for an unknown grammar is unstyled text — which is what this renders for everything, so no language
        ever looks half-supported. The scroll box is the point. One long line inside a flex column widens the column,
        which widens the thread; the <code>min-w-0</code> on the wrapper is what lets <code>overflow-x-auto</code> do
        anything at all. Drag the line below sideways — the card does not move.
      </Note>
      <div className="space-y-3">
        <CodeBlock
          language="graphql"
          code={
            'mutation RespondToolApproval($conversationID: ID!, $messageID: ID!, $approved: Boolean!, $denialMessage: String) {\n' +
            '  coworkerConversationRespondToolApproval(clientID: "w13", conversationID: $conversationID, messageID: $messageID, approved: $approved, denialMessage: $denialMessage)\n' +
            '}'
          }
        />
        <CodeBlock language="json" streaming code={'{\n  "service": {\n    "title": "Consult'} />
      </div>
    </Demo>
  );
}

/* --------------------------------------------------------------------- steps */

function RunDemo() {
  const groupState = rollUpRunState(STEP_TOOLS.map((tool) => tool.state));
  return (
    <>
      <Demo
        name="RunGroup + RunStep"
        tokens="run-active(-soft) · run-skipped(-soft) · success/danger soft chips · divide-border-subtle"
      >
        <Note>
          What a tool call looks like today: <code>&lt;SystemLine&gt;Ran prettify_tool_id&lt;/SystemLine&gt;</code> —
          grey, centred, no arguments, no outcome, no time, and usually not rendered at all, because every tool call
          arrives as two messages with empty <code>content</code> and the module filters empty messages out.
          <br />
          <br />A step says two things in two places: <strong>what kind of act this is</strong> — the leading glyph,
          from the tool's family — and <strong>how it went</strong> — the tint on that glyph and the trailing slot. They
          are separate because the family is known when the call is requested and the outcome arrives seconds later, and
          a card that swaps its icon when the result lands reads as a different step arriving. Open the last one: its
          arguments are a <code>JsonView</code>, not a <code>&lt;pre&gt;</code>.
        </Note>
        <div className="max-w-xl">
          <RunGroup state={groupState} duration={2060} defaultOpen>
            {STEP_TOOLS.map((tool) => {
              const described = describeTool(tool.id);
              return (
                <RunStep
                  key={tool.id}
                  icon={toolIcon(tool.id)}
                  title={described.title}
                  detail={tool.detail}
                  state={tool.state}
                  duration={tool.duration}
                  tone={described.mutating ? 'danger' : 'default'}
                >
                  {tool.id === 'chatfuel_gql-create_service' ? <JsonView value={CREATE_SERVICE_ARGS} /> : undefined}
                </RunStep>
              );
            })}
          </RunGroup>
        </div>
        <Note>
          <code>tone="danger"</code> on the last step is not <code>state="failed"</code>: failed is how the run went,
          danger is what the run will do, and the moment that matters is before either has happened.{' '}
          <code>describeTool</code> decides it from the verb in the id, and reports a verb it does not know as a read —
          a false "this will change your data" on a lookup is the warning that teaches people to ignore warnings.
        </Note>
      </Demo>

      <Demo name="RunStep — the four states" tokens="STATE_CHIP · sr-only state word">
        <Note>
          A tint is not information to somebody who cannot see it, so every step carries its state as a word in the
          accessibility tree; two of the four also show it, because "done" is already said by the duration beside it and
          "running" by the spinner in the chip. Standing alone a step draws its own border — inside a group the group
          owns it, and four bordered cards inside a fifth is the boxes-in-boxes look a run turns into otherwise.
        </Note>
        <div className="max-w-xl space-y-2">
          {ALL_STATES.map((state) => (
            <RunStep
              key={state}
              icon={toolIcon('chatfuel_gql-update_flow')}
              title="Update flow"
              detail={state === 'failed' ? 'NotEnoughPermissions' : 'Welcome message'}
              state={state}
              duration={state === 'running' ? undefined : 1240}
            >
              <JsonView value={{ flowId: 'fl_88213', block: 'welcome', enabled: true }} />
            </RunStep>
          ))}
        </div>
      </Demo>
    </>
  );
}

/* ----------------------------------------------------------------- json view */

const DEEP_VALUE = {
  requestedInMsgID: 'msg_01J9Z6',
  tools: [
    {
      toolID: 'chatfuel_gql-create_service',
      needsManualApprove: true,
      arguments: CREATE_SERVICE_ARGS,
    },
    {
      toolID: 'chatfuel_gql-list_catalog',
      needsManualApprove: false,
      arguments: { botId: '000000000000000000000002' },
    },
  ],
  meta: { a: { b: { c: { d: { e: 'six levels down' } } } }, retried: false, latencyMs: 2060, cursor: null },
};

function JsonDemo() {
  return (
    <Demo
      name="JsonView"
      tokens="text-success string · text-info number · text-accent boolean · border-border-subtle rule"
    >
      <Note>
        This is the real pending approval, and the thing it replaces is <code>JSON.stringify(args, null, 2)</code> in a{' '}
        <code>&lt;pre&gt;</code> — sixteen lines of braces for a batch where yes means the account changes. Strings keep
        their quotes so <code>"12"</code> and <code>12</code> are visibly different, which on a field called{' '}
        <code>amount</code> is the difference between a correct call and a rejected one. The long description is cut to
        a line with the rest one click away. The depth limit is a budget rather than a wall: open <code>meta</code> to
        its floor and the marker hands you another — a hard stop would put the number being approved permanently out of
        reach, and an unbounded walk would take the dashboard down on a value that contains itself.
      </Note>
      <div className="max-w-xl rounded-card border border-border bg-surface-sunken p-3">
        <JsonView value={DEEP_VALUE} maxDepth={3} />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ recorder */

/**
 * A microphone that is not a microphone.
 *
 * `requestStream` is injected for the same reason `rafThrottle`'s scheduler is:
 * every interesting path in the recorder runs through a browser API, and two of
 * them are refusals nobody can produce on demand. Here that same seam gives the
 * gallery a stream with something in it — an oscillator through a gain the
 * second oscillator wobbles — so the level meter has real audio to draw without
 * asking a reviewer to speak into their laptop.
 */
function syntheticStream(): Promise<MediaStream> {
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const tone = context.createOscillator();
  const gain = context.createGain();
  const wobble = context.createOscillator();
  const wobbleDepth = context.createGain();

  tone.type = 'sawtooth';
  tone.frequency.value = 190;
  gain.gain.value = 0.35;
  wobble.frequency.value = 1.9;
  wobbleDepth.gain.value = 0.3;

  wobble.connect(wobbleDepth);
  wobbleDepth.connect(gain.gain);
  tone.connect(gain);
  gain.connect(destination);
  tone.start();
  wobble.start();

  /* The recorder stops the track; the context has to be told separately, or the
     gallery accumulates one per demo run. */
  const [track] = destination.stream.getAudioTracks();
  track?.addEventListener('ended', () => void context.close().catch(() => {}));
  return Promise.resolve(destination.stream);
}

function refuse(name: string, message: string): () => Promise<MediaStream> {
  return () => {
    const error = new Error(message);
    error.name = name;
    return Promise.reject(error);
  };
}

function RecorderDemo() {
  const [last, setLast] = useState<string | null>(null);
  const onSend = (clip: VoiceClip) =>
    setLast(`${clip.mimeType} · ${(clip.blob.size / 1024).toFixed(1)} KB · ${Math.round(clip.durationMs / 100) / 10}s`);

  return (
    <Demo name="VoiceRecorder" tokens="bg-danger dot · bg-accent meter · border-danger slide-to-cancel">
      <Note>
        The honest failure is most of the work, and it is the same failure everywhere: a person can refuse the
        microphone, be on a browser without <code>MediaRecorder</code>, or be inside an iframe that never asked for the
        permission — and each of those otherwise produces a button that looks fine and does nothing. So there are three
        states for that, and the two that are permanent for the page say so instead of offering a retry that shows no
        prompt.
        <br />
        <br />
        The first two below are live: click to start, or hold the second one and slide away from it to cancel. The third
        records a synthesised tone rather than your microphone, so the meter has something to draw — that is{' '}
        <code>requestStream</code>, the same seam that lets the last two show a refusal on demand.
      </Note>
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-1">
          <p className="text-micro text-text-faint">mode="click" · your microphone</p>
          <VoiceRecorder onSend={onSend} />
        </div>
        <div className="space-y-1">
          <p className="text-micro text-text-faint">mode="hold" · your microphone</p>
          <VoiceRecorder mode="hold" onSend={onSend} />
        </div>
        <div className="space-y-1">
          <p className="text-micro text-text-faint">a synthesised stream · 20s cap</p>
          <VoiceRecorder onSend={onSend} requestStream={syntheticStream} maxMs={20_000} />
        </div>
        <div className="space-y-1">
          <p className="text-micro text-text-faint">phase="denied"</p>
          <VoiceRecorder onSend={onSend} requestStream={refuse('NotAllowedError', 'blocked')} />
        </div>
        <div className="space-y-1">
          <p className="text-micro text-text-faint">phase="unsupported"</p>
          <VoiceRecorder onSend={onSend} requestStream={refuse('TypeError', 'This browser cannot record audio.')} />
        </div>
        <div className="space-y-1">
          <p className="text-micro text-text-faint">disabled by the caller</p>
          <VoiceRecorder onSend={onSend} disabled disabledHint="The 24-hour window has closed." />
        </div>
      </div>
      {last ? <p className="mt-3 font-mono text-micro text-text-muted">onSend: {last}</p> : null}
      <Note>
        Press one of the live ones and refuse the prompt to see the third state arrive for real. Escape abandons a
        recording wherever focus is — it is the one gesture that has to work while a pointer is captured by the hold
        button — and the microphone is handed back on every exit, including unmounting mid-recording, or the browser
        leaves its recording indicator lit on a dashboard that is not recording anything.
      </Note>
    </Demo>
  );
}

export function AssistantSection() {
  return (
    <div className="space-y-4">
      <StreamingDemo />
      <MarkdownDemo />
      <CodeBlockDemo />
      <RunDemo />
      <JsonDemo />
      <RecorderDemo />
    </div>
  );
}
