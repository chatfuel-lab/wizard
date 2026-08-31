import { useEffect, useState } from 'react';
import { useTheme } from '~ui';

/**
 * Token manifest. `variable` is the @theme name declared in
 * content/ui/src/styles/tokens.css; `utilities` are the semantic Tailwind
 * classes it generates — the only way components are allowed to reach it.
 * Values are never hardcoded here: they are read back from the live custom
 * property, so this page cannot drift from the stylesheet.
 */
interface TokenSpec {
  variable: string;
  utilities: string[];
  note?: string;
}

interface TokenGroup {
  title: string;
  blurb: string;
  tokens: TokenSpec[];
}

const COLOR_GROUPS: TokenGroup[] = [
  {
    title: 'Surfaces',
    blurb:
      'A neutral grey ramp, shared with the marketing site. Page → card → inset, plus the hover step, the floating-panel surface, two alpha fills and three border weights.',
    tokens: [
      { variable: '--color-surface', utilities: ['bg-surface'], note: 'app background' },
      { variable: '--color-surface-raised', utilities: ['bg-surface-raised'], note: 'cards, topbar, rail' },
      { variable: '--color-surface-sunken', utilities: ['bg-surface-sunken'], note: 'inset rows, chips' },
      { variable: '--color-surface-hover', utilities: ['bg-surface-hover', 'hover:bg-surface-hover'] },
      {
        variable: '--color-surface-overlay',
        utilities: ['bg-surface-overlay'],
        note: 'popover / menu / dialog panel — diverges from raised in dark',
      },
      { variable: '--color-surface-inverse', utilities: ['bg-surface-inverse'], note: 'tooltip, toast' },
      {
        variable: '--color-translucent',
        utilities: ['bg-translucent'],
        note: 'secondary button, kbd — alpha, so one value works on every surface',
      },
      { variable: '--color-translucent-strong', utilities: ['bg-translucent-strong'], note: 'muted count badge' },
      { variable: '--color-border', utilities: ['border-border', 'divide-border'] },
      { variable: '--color-border-strong', utilities: ['border-border-strong'], note: 'table rules, sticky header' },
      { variable: '--color-border-subtle', utilities: ['border-border-subtle'], note: 'hairlines inside cards' },
    ],
  },
  {
    title: 'Text',
    blurb: 'Three steps plus the on-inverse color. Anything dimmer than faint is not a token.',
    tokens: [
      { variable: '--color-text', utilities: ['text-text'], note: 'body + headings' },
      { variable: '--color-text-muted', utilities: ['text-text-muted'], note: 'labels, secondary' },
      { variable: '--color-text-faint', utilities: ['text-text-faint'], note: 'placeholders, timestamps' },
      { variable: '--color-text-inverse', utilities: ['text-text-inverse'], note: 'on bg-surface-inverse' },
    ],
  },
  {
    title: 'Accent & status',
    blurb:
      'One violet accent — the Chatfuel brand, the same value the site uses — plus four status colors, each with a soft tinted background for the same meaning. Info exists so two adjacent states never have to share a color.',
    tokens: [
      { variable: '--color-accent', utilities: ['bg-accent', 'text-accent', 'border-accent'] },
      { variable: '--color-accent-hover', utilities: ['hover:bg-accent-hover'] },
      { variable: '--color-accent-soft', utilities: ['bg-accent-soft'], note: 'selected rows, accent tags' },
      { variable: '--color-accent-fg', utilities: ['text-accent-fg'], note: 'on top of bg-accent' },
      { variable: '--color-danger', utilities: ['text-danger', 'bg-danger'] },
      { variable: '--color-danger-soft', utilities: ['bg-danger-soft'] },
      { variable: '--color-success', utilities: ['text-success', 'bg-success'] },
      { variable: '--color-success-soft', utilities: ['bg-success-soft'] },
      { variable: '--color-warning', utilities: ['text-warning', 'bg-warning'] },
      { variable: '--color-warning-soft', utilities: ['bg-warning-soft'] },
      { variable: '--color-info', utilities: ['text-info', 'bg-info'] },
      { variable: '--color-info-soft', utilities: ['bg-info-soft'] },
    ],
  },
  {
    title: 'Interaction',
    blurb:
      'Focus, selection and loading states. These exist so no component invents its own hover grey or reaches for bg-black/40.',
    tokens: [
      { variable: '--color-focus', utilities: ['focus-ring', 'ring'], note: 'the focus-ring utility uses an outline' },
      { variable: '--color-scrim', utilities: ['bg-scrim'], note: 'modal + drawer backdrop' },
      { variable: '--color-row-hover', utilities: ['hover:bg-row-hover'], note: 'table + list rows' },
      { variable: '--color-row-selected', utilities: ['bg-row-selected'] },
      { variable: '--color-row-selected-hover', utilities: ['hover:bg-row-selected-hover'] },
      { variable: '--color-skeleton', utilities: ['skeleton'], note: 'shimmer base' },
      { variable: '--color-skeleton-highlight', utilities: ['skeleton'], note: 'shimmer sweep' },
      { variable: '--color-control-knob', utilities: ['bg-control-knob'], note: 'switch thumb' },
    ],
  },
  {
    title: 'Pipeline ramp',
    blurb:
      'Six ordered, perceptually stepped hues for a sales pipeline — and a ready categorical ramp if a chart lands. Terminal stages use success/danger instead.',
    tokens: [
      { variable: '--color-pipeline-1', utilities: ['bg-pipeline-1', 'text-pipeline-1'] },
      { variable: '--color-pipeline-2', utilities: ['bg-pipeline-2'] },
      { variable: '--color-pipeline-3', utilities: ['bg-pipeline-3'] },
      { variable: '--color-pipeline-4', utilities: ['bg-pipeline-4'] },
      { variable: '--color-pipeline-5', utilities: ['bg-pipeline-5'] },
      { variable: '--color-pipeline-6', utilities: ['bg-pipeline-6'] },
    ],
  },
  {
    title: 'Chat semantics',
    blurb: 'Bubble colors are their own tokens so a chat re-theme never touches the accent scale.',
    tokens: [
      { variable: '--color-bubble-in', utilities: ['bg-bubble-in'], note: 'incoming bubble' },
      { variable: '--color-bubble-in-fg', utilities: ['text-bubble-in-fg'] },
      { variable: '--color-bubble-out', utilities: ['bg-bubble-out'], note: 'outgoing bubble' },
      { variable: '--color-bubble-out-fg', utilities: ['text-bubble-out-fg'] },
    ],
  },
  {
    title: 'Run semantics',
    blurb:
      'A tool call’s step card. Running is not info — info is an alert tone, and a run group is four steps in a row, three of which will be running at some point. Skipped is not text-faint — faint is the placeholder step of the text ramp, and “this did not run” is a state, not a de-emphasis. Done and failed borrow success and danger, which already say exactly that.',
    tokens: [
      { variable: '--color-run-active', utilities: ['text-run-active', 'bg-run-active'], note: 'a step in flight' },
      { variable: '--color-run-active-soft', utilities: ['bg-run-active-soft'], note: 'its glyph chip' },
      { variable: '--color-run-skipped', utilities: ['text-run-skipped'], note: 'a step that did not run' },
      { variable: '--color-run-skipped-soft', utilities: ['bg-run-skipped-soft'] },
    ],
  },
  {
    title: 'Event palette',
    blurb:
      'Eight categorical tones for calendar events, each in three roles: solid (bar, dot, chart), soft (block fill) and fg (text on soft). Blue, teal, violet, pink, orange, lime, cyan, fuchsia — indigo is absent because the accent means "selected". Nominal, not ordered: spread round the wheel, unlike the pipeline ramp.',
    tokens: [
      { variable: '--color-event-1', utilities: ['bg-event-1', 'border-event-1'], note: 'blue — solid' },
      { variable: '--color-event-1-soft', utilities: ['bg-event-1-soft'], note: 'block fill' },
      { variable: '--color-event-1-fg', utilities: ['text-event-1-fg'], note: 'text on soft' },
      { variable: '--color-event-2', utilities: ['bg-event-2'], note: 'teal' },
      { variable: '--color-event-2-soft', utilities: ['bg-event-2-soft'] },
      { variable: '--color-event-2-fg', utilities: ['text-event-2-fg'] },
      { variable: '--color-event-3', utilities: ['bg-event-3'], note: 'violet' },
      { variable: '--color-event-3-soft', utilities: ['bg-event-3-soft'] },
      { variable: '--color-event-3-fg', utilities: ['text-event-3-fg'] },
      { variable: '--color-event-4', utilities: ['bg-event-4'], note: 'pink' },
      { variable: '--color-event-4-soft', utilities: ['bg-event-4-soft'] },
      { variable: '--color-event-4-fg', utilities: ['text-event-4-fg'] },
      { variable: '--color-event-5', utilities: ['bg-event-5'], note: 'orange' },
      { variable: '--color-event-5-soft', utilities: ['bg-event-5-soft'] },
      { variable: '--color-event-5-fg', utilities: ['text-event-5-fg'] },
      { variable: '--color-event-6', utilities: ['bg-event-6'], note: 'lime' },
      { variable: '--color-event-6-soft', utilities: ['bg-event-6-soft'] },
      { variable: '--color-event-6-fg', utilities: ['text-event-6-fg'] },
      { variable: '--color-event-7', utilities: ['bg-event-7'], note: 'cyan' },
      { variable: '--color-event-7-soft', utilities: ['bg-event-7-soft'] },
      { variable: '--color-event-7-fg', utilities: ['text-event-7-fg'] },
      { variable: '--color-event-8', utilities: ['bg-event-8'], note: 'fuchsia' },
      { variable: '--color-event-8-soft', utilities: ['bg-event-8-soft'] },
      { variable: '--color-event-8-fg', utilities: ['text-event-8-fg'] },
    ],
  },
  {
    title: 'Calendar semantics',
    blurb:
      'The time grid’s own roles. now is not danger — the clock hand is a landmark, not a warning. Off-hours is a flat shading (most of every day is off-hours); busy and blocked are hatches — "someone has this" vs "nobody may have this"; available is the green a free slot turns.',
    tokens: [
      { variable: '--color-now', utilities: ['bg-now'], note: 'the now-line' },
      {
        variable: '--color-off-hours',
        utilities: ['hatch-off-hours'],
        note: 'outside business hours — a flat tint, via @utility',
      },
      { variable: '--color-busy', utilities: ['hatch-busy'], note: 'stripe of the busy hatch' },
      { variable: '--color-busy-soft', utilities: ['hatch-busy'], note: 'ground of the busy hatch' },
      { variable: '--color-blocked', utilities: ['hatch-blocked'], note: 'breaks, closed days — denser stripes' },
      { variable: '--color-available', utilities: ['bg-available'], note: 'free-slot marker' },
      { variable: '--color-available-soft', utilities: ['bg-available-soft'] },
    ],
  },
  {
    title: 'Channel semantics',
    blurb:
      'One pair per messaging platform: the solid is the glyph, the soft is the tinted circle behind it — the channel badge on an AI Automations card, the platform cell in a table. Brand-adjacent, not brand-exact, and every solid clears 3:1 on its own soft in both themes; the WhatsApp green is darker than the brand’s for that reason. Widget is the product’s own channel, so it is the accent, not a sixth hue. In dark mode the softs are low-alpha tints, so one value sits on a card and a sunken row alike.',
    tokens: [
      {
        variable: '--color-channel-instagram',
        utilities: ['text-channel-instagram'],
        note: 'channel glyph + tinted circle in AI Automations',
      },
      { variable: '--color-channel-instagram-soft', utilities: ['bg-channel-instagram-soft'] },
      {
        variable: '--color-channel-whatsapp',
        utilities: ['text-channel-whatsapp'],
        note: 'darker than the brand green — 3:1 on its soft',
      },
      { variable: '--color-channel-whatsapp-soft', utilities: ['bg-channel-whatsapp-soft'] },
      { variable: '--color-channel-facebook', utilities: ['text-channel-facebook'] },
      { variable: '--color-channel-facebook-soft', utilities: ['bg-channel-facebook-soft'] },
      {
        variable: '--color-channel-tiktok',
        utilities: ['text-channel-tiktok'],
        note: 'near-black; inverts to near-white in dark',
      },
      { variable: '--color-channel-tiktok-soft', utilities: ['bg-channel-tiktok-soft'] },
      {
        variable: '--color-channel-widget',
        utilities: ['text-channel-widget'],
        note: 'the accent family — the product’s own channel',
      },
      { variable: '--color-channel-widget-soft', utilities: ['bg-channel-widget-soft'] },
    ],
  },
  {
    title: 'Canvas semantics',
    blurb:
      'A canvas is the one surface explicitly behind everything, and the only place a 1px line has to stay readable at 10% zoom and quiet at 250%. In dark mode it goes DARKER than the page, not lighter: it is the floor, and nodes are cards lifted off it.',
    tokens: [
      { variable: '--color-canvas', utilities: ['bg-canvas'], note: 'the floor' },
      { variable: '--color-canvas-grid', utilities: ['canvas-grid'], note: 'dots, via @utility' },
      { variable: '--color-edge', utilities: ['stroke-edge'], note: 'connection at rest' },
      { variable: '--color-edge-hover', utilities: ['stroke-edge-hover'] },
      { variable: '--color-edge-selected', utilities: ['stroke-edge-selected'] },
      { variable: '--color-edge-ghost', utilities: ['stroke-edge-ghost'], note: 'dragging, no target yet' },
      { variable: '--color-handle', utilities: ['fill-handle'], note: 'output pip' },
      { variable: '--color-handle-active', utilities: ['fill-handle-active'] },
      { variable: '--color-selection-fill', utilities: ['fill-selection-fill'], note: 'marquee' },
      { variable: '--color-selection-stroke', utilities: ['stroke-selection-stroke'] },
      { variable: '--color-guide', utilities: ['stroke-guide'], note: 'alignment — not the accent, on purpose' },
    ],
  },
];

const RADIUS_TOKENS: TokenSpec[] = [
  { variable: '--radius-chip', utilities: ['rounded-chip'], note: 'tags, icon buttons' },
  { variable: '--radius-control', utilities: ['rounded-control'], note: 'buttons, inputs, selects' },
  { variable: '--radius-card', utilities: ['rounded-card'], note: 'cards, dialogs, popovers' },
  { variable: '--radius-bubble', utilities: ['rounded-bubble'], note: 'chat bubbles' },
  { variable: '--radius-pill', utilities: ['rounded-pill'], note: 'buttons — not fields' },
];

const ELEVATION_TOKENS: TokenSpec[] = [
  { variable: '--shadow-raised', utilities: ['shadow-raised'], note: 'cards at rest — almost invisible on purpose' },
  { variable: '--shadow-overlay', utilities: ['shadow-overlay'], note: 'popovers, menus' },
  { variable: '--shadow-modal', utilities: ['shadow-modal'], note: 'dialogs, drawers' },
  { variable: '--shadow-drag', utilities: ['shadow-drag'], note: 'the thing under the cursor' },
  { variable: '--shadow-card-inset', utilities: ['shadow-card-inset'], note: 'the hairline a card wears at rest' },
  {
    variable: '--shadow-secondary-button',
    utilities: ['shadow-secondary-button'],
    note: 'inset edge + a 1px lift, on a fill that has no border',
  },
];

const DURATION_TOKENS: TokenSpec[] = [
  { variable: '--transition-duration-instant', utilities: ['duration-instant'], note: 'press feedback' },
  { variable: '--transition-duration-fast', utilities: ['duration-fast'], note: 'hover, color changes' },
  { variable: '--transition-duration-base', utilities: ['duration-base'], note: 'enter transitions' },
  { variable: '--transition-duration-slow', utilities: ['duration-slow'], note: 'panels, drawers' },
  { variable: '--transition-delay-tooltip', utilities: ['delay-tooltip'] },
];

const EASING_TOKENS: TokenSpec[] = [
  { variable: '--ease-standard', utilities: ['ease-standard'], note: 'the default for anything moving' },
  { variable: '--ease-entrance', utilities: ['ease-entrance'], note: 'decelerate in' },
  { variable: '--ease-exit', utilities: ['ease-exit'], note: 'accelerate out' },
  { variable: '--ease-spring', utilities: ['ease-spring'], note: 'settle, knobs' },
];

const LAYER_TOKENS: TokenSpec[] = [
  { variable: '--z-index-sticky', utilities: ['z-sticky'], note: 'sticky table header, pinned column' },
  { variable: '--z-index-rail', utilities: ['z-rail'], note: 'topbar, nav rail' },
  { variable: '--z-index-dropdown', utilities: ['z-dropdown'], note: 'inline, non-portaled menus' },
  { variable: '--z-index-drag', utilities: ['z-drag'], note: 'drag layer' },
  { variable: '--z-index-overlay', utilities: ['z-overlay'], note: 'scrim + dialog panel' },
  { variable: '--z-index-popover', utilities: ['z-popover'], note: 'portaled popovers — above modals' },
  { variable: '--z-index-toast', utilities: ['z-toast'] },
  { variable: '--z-index-tooltip', utilities: ['z-tooltip'] },
];

const DENSITY_TOKENS: TokenSpec[] = [
  { variable: '--height-topbar', utilities: ['h-topbar'], note: 'app + dialog header' },
  { variable: '--height-field', utilities: ['h-field'], note: 'inputs, selects, md buttons' },
  { variable: '--height-field-sm', utilities: ['h-field-sm'], note: 'sm buttons, icon buttons' },
  { variable: '--height-row-compact', utilities: ['h-row-compact'] },
  { variable: '--height-row-cozy', utilities: ['h-row-cozy'], note: 'table default' },
  { variable: '--height-row-comfortable', utilities: ['h-row-comfortable'] },
  { variable: '--height-touch', utilities: ['touch-target'], note: '44px — opt-in, never global' },
  {
    variable: '--height-hour-compact',
    utilities: ['h-hour-compact'],
    note: 'time grid, one hour — mirrored by HOUR_PX',
  },
  { variable: '--height-hour-cozy', utilities: ['h-hour-cozy'], note: 'time grid default' },
  { variable: '--height-hour-comfortable', utilities: ['h-hour-comfortable'] },
  { variable: '--height-event-min', utilities: [], note: 'floor under a block — MIN_EVENT_PX' },
];

/**
 * The band thresholds. These are the same numbers as lib/layout.ts's Band
 * boundaries — content/ui/src/lib/layout.test.ts parses tokens.css and asserts
 * it, because a drift here means CSS and JS disagree at exactly the boundary.
 */
const BAND_TOKENS: TokenSpec[] = [
  {
    variable: '--container-compact',
    utilities: ['@compact:', '@max-compact:'],
    note: "@max-compact: ⟺ band === 'compact'",
  },
  {
    variable: '--container-wide',
    utilities: ['@wide:', '@max-wide:'],
    note: '@wide: ⟺ band is wide or inline',
  },
  {
    variable: '--container-inline',
    utilities: ['@inline:'],
    note: "@inline: ⟺ band === 'inline'",
  },
];

const MEASURE_TOKENS: TokenSpec[] = [
  { variable: '--container-drawer', utilities: ['max-w-drawer'], note: 'Drawer default width' },
  { variable: '--container-auth', utilities: ['max-w-auth'], note: 'AuthLayout width="sm"' },
  { variable: '--container-auth-wide', utilities: ['max-w-auth-wide'], note: 'AuthLayout width="md"' },
  { variable: '--container-form', utilities: ['max-w-form'], note: 'a settings form column' },
  { variable: '--container-prose', utilities: ['max-w-prose'], note: 'long text' },
  { variable: '--container-app', utilities: ['max-w-app'], note: 'centred page max width' },
];

const LAYOUT_WIDTH_TOKENS: TokenSpec[] = [
  { variable: '--width-rail', utilities: ['w-rail'], note: 'icon-only nav rail' },
  { variable: '--width-rail-expanded', utilities: ['w-rail-expanded'], note: 'labelled nav rail' },
  { variable: '--width-sidenav', utilities: ['w-sidenav'], note: 'scope nav, flow picker' },
  { variable: '--width-list', utilities: ['w-list'], note: 'master list (inbox, coworker)' },
  { variable: '--width-inspector', utilities: ['w-inspector'], note: 'flow-builder inspector' },
  { variable: '--width-panel', utilities: ['w-panel'], note: 'deals detail panel' },
  { variable: '--width-column', utilities: ['w-column'], note: 'deals board column' },
  { variable: '--width-column-rail', utilities: ['w-column-rail'], note: 'collapsed board column' },
  { variable: '--width-time-gutter', utilities: ['w-time-gutter'], note: 'time grid hour labels' },
  { variable: '--width-time-column', utilities: ['min-w-time-column'], note: 'time grid column minimum' },
];

const SPACING_TOKENS: TokenSpec[] = [
  {
    variable: '--spacing-gutter',
    utilities: ['p-gutter', 'gap-gutter'],
    note: 'page padding — fluid inside a ModuleRoot',
  },
  { variable: '--spacing-gutter-tight', utilities: [], note: 'the compact/narrow step' },
  { variable: '--spacing-gutter-loose', utilities: [], note: 'the inline step' },
];

/**
 * Viewport breakpoints — Tailwind's stock values, declared explicitly so they
 * land in :root and can be read back here. They drive `content/shell` chrome only;
 * module code must use the band tokens above.
 */
const BREAKPOINT_TOKENS: TokenSpec[] = [
  { variable: '--breakpoint-sm', utilities: ['sm:'], note: 'shell chrome only' },
  { variable: '--breakpoint-md', utilities: ['md:'], note: 'shell chrome only — nav collapses here' },
  { variable: '--breakpoint-lg', utilities: ['lg:'], note: 'shell chrome only' },
  { variable: '--breakpoint-xl', utilities: ['xl:'], note: 'shell chrome only' },
  { variable: '--breakpoint-2xl', utilities: ['2xl:'], note: 'shell chrome only' },
];

const TYPE_TOKENS: TokenSpec[] = [
  { variable: '--font-sans', utilities: ['font-sans'], note: 'Geist — everything that is not a heading' },
  { variable: '--font-display', utilities: ['font-display'], note: 'Manrope — h1–h6, set by the base layer' },
  { variable: '--font-mono', utilities: ['font-mono'], note: 'Geist Mono — code, ids, JSON' },
  { variable: '--text-display', utilities: ['text-display'], note: 'one number on an empty screen' },
  { variable: '--text-title-1', utilities: ['text-title-1'], note: 'auth screen headline' },
  { variable: '--text-title-2', utilities: ['text-title-2'] },
  { variable: '--text-title-3', utilities: ['text-title-3'] },
  { variable: '--text-title-4', utilities: ['text-title-4'], note: 'empty-state heading' },
  { variable: '--text-title', utilities: ['text-title'], note: 'module page title' },
  { variable: '--text-heading', utilities: ['text-heading'], note: 'section heading' },
  { variable: '--text-body', utilities: ['text-body'], note: 'default reading size' },
  { variable: '--text-label', utilities: ['text-label'], note: 'form labels, chips' },
  { variable: '--text-meta', utilities: ['text-meta'], note: 'timestamps, counts' },
  { variable: '--text-micro', utilities: ['text-micro'], note: 'retires the 11px arbitraries' },
  { variable: '--text-nano', utilities: ['text-nano'], note: 'counts and glyphs inside a chip' },
  { variable: '--text-xs', utilities: ['text-xs'], note: 'alias of micro — Tailwind stock, same ramp' },
  { variable: '--text-sm', utilities: ['text-sm'], note: 'alias of label' },
  { variable: '--text-base', utilities: ['text-base'], note: 'alias of body' },
];

const NON_COLOR_GROUPS = [
  RADIUS_TOKENS,
  ELEVATION_TOKENS,
  DURATION_TOKENS,
  EASING_TOKENS,
  LAYER_TOKENS,
  DENSITY_TOKENS,
  BAND_TOKENS,
  MEASURE_TOKENS,
  LAYOUT_WIDTH_TOKENS,
  SPACING_TOKENS,
  BREAKPOINT_TOKENS,
  TYPE_TOKENS,
];

const ALL_VARIABLES = [
  ...COLOR_GROUPS.flatMap((group) => group.tokens.map((token) => token.variable)),
  ...NON_COLOR_GROUPS.flatMap((group) => group.map((token) => token.variable)),
];

/**
 * Reads every token back off :root. Re-runs when the resolved theme changes —
 * without that dependency the swatches would keep showing light values after a
 * theme switch, which is exactly the drift this page exists to catch.
 */
function useTokenValues(variables: string[], revision: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const variable of variables) next[variable] = computed.getPropertyValue(variable).trim();
    setValues(next);
    // `variables` is a module-level constant list; `revision` is what re-reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
  return values;
}

function CopyableCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-chip bg-surface-sunken px-1.5 py-0.5 font-mono text-micro text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
      title="Copy"
    >
      {copied ? 'copied' : text}
    </button>
  );
}

function TokenMeta({ token, value }: { token: TokenSpec; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <CopyableCode text={token.variable} />
        <span className="font-mono text-micro text-text-faint">{value || '—'}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {token.utilities.map((utility) => (
          <CopyableCode key={utility} text={utility} />
        ))}
        {token.note ? <span className="text-xs text-text-muted">{token.note}</span> : null}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-card border border-border bg-surface-raised">{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0">{children}</div>
  );
}

function Section({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-0.5 mb-3 text-xs text-text-muted">{blurb}</p>
      {children}
    </section>
  );
}

export function TokensSection() {
  const { resolved } = useTheme();
  const values = useTokenValues(ALL_VARIABLES, resolved);

  return (
    <div className="space-y-8">
      {COLOR_GROUPS.map((group) => (
        <Section key={group.title} title={group.title} blurb={group.blurb}>
          <Panel>
            {group.tokens.map((token) => (
              <Row key={token.variable}>
                <div
                  className="h-10 w-10 shrink-0 rounded-control border border-border"
                  style={{ background: values[token.variable] || 'transparent' }}
                />
                <TokenMeta token={token} value={values[token.variable] ?? ''} />
              </Row>
            ))}
          </Panel>
        </Section>
      ))}

      <Section
        title="Radius"
        blurb="Semantic, not a t-shirt scale — a rebrand is one edit per role rather than a search for every rounded-lg."
      >
        <Panel>
          {RADIUS_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div
                className="h-10 w-16 shrink-0 border border-border bg-accent-soft"
                style={{ borderRadius: values[token.variable] || undefined }}
              />
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Elevation"
        blurb="Four steps. Shadow tints are re-mapped for dark mode, where a black shadow on a black surface would be invisible."
      >
        <Panel>
          {ELEVATION_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div
                className="h-10 w-16 shrink-0 rounded-card bg-surface-raised"
                style={{ boxShadow: values[token.variable] || undefined }}
              />
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Motion — duration"
        blurb="Hover the swatch to play the duration. Every value collapses to 1ms under prefers-reduced-motion."
      >
        <Panel>
          {DURATION_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="h-10 w-16 shrink-0 overflow-hidden rounded-control bg-surface-sunken">
                <div
                  className="h-full w-full origin-left scale-x-0 bg-accent transition-transform hover:scale-x-100"
                  style={{ transitionDuration: values[token.variable] || undefined }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section title="Motion — easing" blurb="Hover to play. Standard is the default for anything that moves.">
        <Panel>
          {EASING_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="group h-10 w-16 shrink-0 overflow-hidden rounded-control bg-surface-sunken">
                <div
                  className="mt-3 h-4 w-4 translate-x-1 rounded-full bg-accent transition-transform duration-slow group-hover:translate-x-11"
                  style={{ transitionTimingFunction: values[token.variable] || undefined }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Layers"
        blurb="One ordered ladder so no component has to invent a magic number. Note the variable namespace is --z-index-*, which is what makes Tailwind emit z-overlay."
      >
        <Panel>
          {LAYER_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-control bg-surface-sunken font-mono text-sm text-text-muted tabular-nums">
                {values[token.variable] || '—'}
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Density & chrome"
        blurb="Control and row heights live in tokens so a density switch is a token swap, not a class rewrite."
      >
        <Panel>
          {DENSITY_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center justify-center">
                <div
                  className="w-10 rounded-chip bg-accent-soft"
                  style={{ height: values[token.variable] || undefined, maxHeight: 40 }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Bands"
        blurb="Container thresholds, in pixels on purpose: a container query in rem resolves against the ROOT font size while ResizeObserver reports pixels, so a host with html{font-size:18px} would desynchronize CSS from JS. The same three numbers are lib/layout.ts's Band boundaries, and layout.test.ts parses this file to prove it."
      >
        <Panel>
          {BAND_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-control bg-surface-sunken font-mono text-meta text-text-muted tabular-nums">
                {values[token.variable] || '—'}
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Layout widths"
        blurb="Semantic roles, not a scale. --width-list and --width-inspector being equal today is a coincidence, not a synonym — a rebrand should be able to move one without the other."
      >
        <Panel>
          {LAYOUT_WIDTH_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center">
                <div
                  className="h-4 rounded-chip bg-accent-soft"
                  style={{ width: values[token.variable] || undefined, maxWidth: 64 }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Content measure"
        blurb="Max-widths for content columns. Same --container-* namespace as the bands, so these also emit meaningless @form:-style variants — ignore those."
      >
        <Panel>
          {MEASURE_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center">
                <div
                  className="h-4 rounded-chip bg-surface-sunken"
                  style={{ width: values[token.variable] || undefined, maxWidth: 64 }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Spacing"
        blurb="p-gutter compiles to padding:var(--spacing-gutter), so ModuleRoot re-assigns the variable inside a container query rather than shipping responsive classes — every p-gutter already written in the repo becomes fluid for free."
      >
        <Panel>
          {SPACING_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center justify-center">
                <div
                  className="h-4 rounded-chip bg-accent-soft"
                  style={{ width: values[token.variable] || undefined }}
                />
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Viewport breakpoints"
        blurb="Tailwind's stock values, declared explicitly so they land in :root and can be read back here. They drive content/shell chrome ONLY — a module can be 700px wide inside a 2560px viewport, so module code uses the bands above."
      >
        <Panel>
          {BREAKPOINT_TOKENS.map((token) => (
            <Row key={token.variable}>
              <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-control bg-surface-sunken font-mono text-meta text-text-muted tabular-nums">
                {values[token.variable] || '—'}
              </div>
              <TokenMeta token={token} value={values[token.variable] ?? ''} />
            </Row>
          ))}
        </Panel>
      </Section>

      <Section
        title="Typography"
        blurb="One family; a semantic size scale with baked line-height but NOT weight — the repo writes `text-sm font-semibold`, and a size token that silently set weight would surprise."
      >
        <div className="space-y-3 rounded-card border border-border bg-surface-raised p-4">
          {TYPE_TOKENS.map((token) => (
            <div key={token.variable} className="flex flex-wrap items-center gap-2">
              <CopyableCode text={token.variable} />
              {token.utilities.map((utility) => (
                <CopyableCode key={utility} text={utility} />
              ))}
              <span className="font-mono text-micro text-text-faint">{values[token.variable] || '—'}</span>
            </div>
          ))}
          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-title font-semibold text-text">Title — text-title font-semibold</p>
            <p className="text-heading font-semibold text-text">Heading — text-heading font-semibold</p>
            <p className="text-body text-text">Body — text-body</p>
            <p className="text-label text-text-muted">Label — text-label text-text-muted</p>
            <p className="text-meta text-text-faint">Meta — text-meta text-text-faint</p>
            <p className="text-micro text-text-faint">Micro — text-micro, retires the 11px arbitraries</p>
            {/* Shown against a chip, because nano out of its container reads as
                a mistake: its line height is taller than its font size on
                purpose, and only a chip makes that look deliberate. */}
            <p className="text-nano text-text-faint">
              Nano — text-nano, for counts in a chip like{' '}
              <span className="rounded-chip bg-accent px-1.5 py-px font-medium tabular-nums text-accent-fg">12</span>
            </p>
            <p className="font-mono text-body text-text tabular-nums">Numbers — tabular-nums 1,234.50 · 9 · 1000</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
