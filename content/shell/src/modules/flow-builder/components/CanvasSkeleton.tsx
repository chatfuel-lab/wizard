import { PageHeader, Skeleton } from '~ui';

/**
 * Where the cards go while nothing is known yet — a short chain, the shape
 * nearly every flow starts as. Positions are rem offsets from the top-left, not
 * percentages, so the picture is the same picture at every canvas width and
 * does not stretch a card to a shape no real card has. Card width matches
 * `BlockNode` (16rem) so the real canvas landing on top of this is a fill, not
 * a jump.
 */
const CARDS: readonly { left: string; top: string; height: string }[] = [
  { left: '3rem', top: '3rem', height: '7rem' },
  { left: '23rem', top: '2rem', height: '9.5rem' },
  { left: '23rem', top: '13.5rem', height: '5.5rem' },
  { left: '43rem', top: '6rem', height: '7rem' },
];

/**
 * The editor before its first flow: the header's shape, and the canvas's grid
 * with card-shaped placeholders on it, instead of one spinner in the middle of
 * an empty pane.
 *
 * Only ever seen on a cold open. A flow that has been opened on this device
 * before paints from its snapshot and never reaches this; a flow that has not
 * shows this for exactly one round trip.
 */
export function CanvasSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" aria-busy="true">
      <span className="sr-only" role="status">
        Loading flow
      </span>
      <PageHeader title={<Skeleton width="10rem" height="1rem" />} />
      {/* The grid utility paints one dot per background tile and leaves the
          tile size to the canvas, which sets it from the zoom. Here there is
          no zoom, so the tile is the grid at 1:1 — the same 24 the canvas
          starts from, so the dots do not shift when the real one arrives. */}
      <div className="canvas-grid relative min-h-0 flex-1 overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
        {CARDS.map((card) => (
          <div key={`${card.left}-${card.top}`} className="absolute" style={{ left: card.left, top: card.top }}>
            <Skeleton variant="block" width="16rem" height={card.height} />
          </div>
        ))}
      </div>
    </div>
  );
}
