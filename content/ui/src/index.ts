/* The public surface of the design system. Each top-level directory keeps its
 * own barrel (`<dir>/index.ts`) naming exactly what it exports, so the export
 * list for a component lives beside the component; this file only stitches
 * those barrels together, and every name reaches consumers through it. `lib/`
 * is the headless layer — pure functions grouped by domain (geometry, time,
 * chat, data, interaction, app, markdown) — and its barrel deliberately
 * exports a chosen subset: a lib module absent from `lib/index.ts` is
 * package-internal on purpose. */

export * from './primitives/index';
export * from './shell/index';
export * from './layout/index';
export * from './chat/index';
export * from './forms/index';
export * from './data/index';
export * from './feedback/index';
export * from './overlay/index';
export * from './nav/index';
export * from './dnd/index';
export * from './lib/index';
export * from './canvas/index';
export * from './calendar/index';
export * from './floating/index';
export * from './hooks/index';
export * from './theme/index';
export * from './icons/index';
export * from './app/index';
