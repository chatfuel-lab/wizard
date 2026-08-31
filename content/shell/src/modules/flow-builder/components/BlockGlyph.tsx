import {
  CanvasHandle,
  IconBolt,
  IconBook,
  IconCalendar,
  IconColumns,
  IconExternal,
  IconFile,
  IconFilter,
  IconFlow,
  IconImage,
  IconInbox,
  IconLayoutList,
  IconLink,
  IconMic,
  IconMinus,
  IconMonitor,
  IconPlay,
  IconSend,
  IconSparkles,
  IconUser,
  IconUsers,
} from '~ui';
import type { GlyphId, VisualTone } from '../lib/blockVisuals';

/* `typeof IconSend` rather than an `IconProps` component type, because `~ui`
   keeps `IconProps` private. Every icon shares the signature, so one of them stands for all of them
   and nothing had to be exported to make this compile. */
const GLYPHS: Record<GlyphId, typeof IconSend> = {
  send: IconSend,
  image: IconImage,
  play: IconPlay,
  mic: IconMic,
  file: IconFile,
  buttons: IconColumns,
  link: IconLink,
  list: IconLayoutList,
  book: IconBook,
  branch: IconFilter,
  user: IconUser,
  minus: IconMinus,
  external: IconExternal,
  flow: IconFlow,
  users: IconUsers,
  sparkles: IconSparkles,
  bolt: IconBolt,
  calendar: IconCalendar,
  monitor: IconMonitor,
  inbox: IconInbox,
};

/** The icon component behind a glyph id — for the palette, which draws its own rows. */
export function glyphIcon(glyph: GlyphId): typeof IconSend {
  return GLYPHS[glyph];
}

/**
 * Tone → classes, spelled out rather than assembled.
 *
 * `` `bg-${tone}-soft` `` would be a class that appears nowhere in any source
 * file, and Tailwind reads source files as text: the utility would never be
 * generated and the tile would come out unpainted. This is the same rule that
 * makes `CanvasEdges` spell out its stroke and fill maps.
 *
 * Each pair is a designed pair — a `-soft` background with its own foreground —
 * so legibility in both themes is the token system's problem and not this
 * file's guesswork.
 */
const TILE: Record<VisualTone, string> = {
  entry: 'bg-success-soft text-success',
  message: 'bg-accent-soft text-accent',
  logic: 'bg-info-soft text-info',
  ai: 'bg-warning-soft text-warning',
  neutral: 'bg-surface-sunken text-text-muted',
};

/** `card` is the block's own badge; `row` is the one on an element inside it. */
const SIZE = {
  card: { box: 'size-7 rounded-lg', icon: 15 },
  row: { box: 'size-5 rounded-md', icon: 12 },
} as const;

export function BlockGlyph({
  glyph,
  tone,
  variant = 'row',
}: {
  glyph: GlyphId;
  tone: VisualTone;
  variant?: keyof typeof SIZE;
}) {
  const Icon = GLYPHS[glyph];
  const size = SIZE[variant];
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${size.box} ${TILE[tone]}`}>
      <Icon size={size.icon} />
    </span>
  );
}

/**
 * An element's outlet: the label of the thing that branches, with the pip that
 * edges leave from sitting on the card's edge beside it.
 *
 * The pip is `absolute` against the block card rather than against this row,
 * which is why the row does not need to be `relative` and why the pip lines up
 * with the card's border instead of floating somewhere near it. `CanvasHandle`
 * splits itself into a positioning shell and a measured pip precisely so a
 * caller can say where without fighting the pip's own layout.
 */
export function OutletRow({ blockId, handleId, label }: { blockId: string; handleId: string; label: string }) {
  /* It stands for the button the contact will see, and it looks like one: a
     white rounded rectangle with the label in the accent colour, which is what
     a reply button is on every one of these platforms. Not an outlined pill —
     an edge read as a form control, and nothing here is clickable but the pip.
     The contrast comes from the ground: the element card is sunken, this is
     raised, and the accent text carries the rest. */
  return (
    <div className="relative mt-1.5 flex items-center justify-between gap-2 rounded-control bg-surface-raised px-2.5 py-1 shadow-raised">
      <span className="truncate text-xs font-medium text-accent">{label}</span>
      {/* -24px, which is not arbitrary: this row is inset from the card's right
          edge by the card's border (1) plus its own padding (8) plus the
          element card's border and padding (1 + 8) = 18, and half a 10px pip is
          5 more. The pip lands ON the card's boundary, which is where a
          connector reads as belonging to the card rather than floating near
          it. */}
      <CanvasHandle
        nodeId={blockId}
        id={handleId}
        side="right"
        type="source"
        label={`Connect ${label}`}
        className="absolute -right-6 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
