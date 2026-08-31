/**
 * Lane packing for overlapping events in one column.
 *
 * Greedy, first-free-lane, over items sorted by start (ties: longer first,
 * then id — stable, so the same input always packs the same way and a
 * re-render never swaps two blocks). Each connected CLUSTER of overlaps
 * shares one lane count, which is what lets a block be full-width when it
 * overlaps nothing even though three others tangle further down the day.
 *
 * FullCalendar does the same thing with more options; Google Calendar
 * cascades instead (later starts overlap earlier ones with an offset). Even
 * split is the honest choice for a booking grid — every booking is as
 * important as the one beside it, and a cascade hides the earlier one's end.
 */

export interface LaneItem {
  id: string;
  start: number;
  end: number;
}

export interface LanePlacement {
  /** 0-based lane inside the cluster. */
  lane: number;
  /** How many lanes the cluster needs — the divisor for the block's width. */
  lanes: number;
}

/** Placement per id. Empty and inverted items get lane 0 of a 1-lane cluster. */
export function packLanes(items: readonly LaneItem[]): Map<string, LanePlacement> {
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const out = new Map<string, LanePlacement>();
  /* Lane → the end of the item currently occupying it. */
  let laneEnds: number[] = [];
  let cluster: string[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const id of cluster) {
      const placement = out.get(id);
      if (placement) placement.lanes = lanes;
    }
    laneEnds = [];
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    const end = Math.max(item.end, item.start);
    /* Abutting is not overlapping: an item starting exactly at the cluster's
       end begins a new cluster. */
    if (item.start >= clusterEnd && cluster.length > 0) flush();

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    out.set(item.id, { lane, lanes: 1 });
    cluster.push(item.id);
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length > 0) flush();
  return out;
}
