/**
 * Why this page is read-only, said out loud.
 *
 * Services and Team are MIRRORS: the bookings module owns editing them, and
 * two editors over one entity drift (`lib/sources.ts` carries that policy).
 * But a page that quietly drops its buttons is a page whose reader concludes
 * the product is broken, so the mode is never implied — it is stated, with the
 * place the edit actually lives.
 *
 * Three modes, and they are genuinely different sentences:
 *
 *   edit             this module owns it here; the buttons are real
 *   owned-elsewhere  bookings is installed and owns it; the link goes there
 *   no-permission    the role has no `Ai: Edit`; nothing anywhere will help
 *
 * `canEditHere` arrives already ANDed with the role (see the workspace), which
 * is exactly why the two flags are both needed to tell the last two apart.
 */
import { sourceMeta, type SourceId } from './sources';

export type EditMode = 'edit' | 'owned-elsewhere' | 'no-permission';

export function editMode(canEdit: boolean, canEditHere: boolean): EditMode {
  if (canEditHere) return 'edit';
  return canEdit ? 'owned-elsewhere' : 'no-permission';
}

export interface ModeNotice {
  title: string;
  /** Optional: a mirror that just points somewhere needs a title and a link, nothing more. */
  body?: string;
  /** Where the edit lives, when it lives somewhere. A hash route — never `window.location`. */
  href?: string;
  linkLabel?: string;
}

const OWNER_LABEL: Record<'bookings', string> = { bookings: 'Bookings' };

/**
 * The banner for a read-only page, or null when the page can be edited here
 * and has nothing to explain.
 */
export function modeNotice(source: SourceId, mode: EditMode): ModeNotice | null {
  if (mode === 'edit') return null;
  const meta = sourceMeta(source);
  const noun = meta.label.toLocaleLowerCase();

  if (mode === 'no-permission') {
    return {
      title: `You can read ${noun}, not change them`,
      body: 'Editing anything the assistant reads needs the Ai · Edit permission on this bot. Everything below is what the AI currently knows.',
    };
  }

  const owner = meta.ownedBy ? OWNER_LABEL[meta.ownedBy] : null;
  if (!owner || !meta.ownerHref) {
    /* Not reachable through the rail — every ownerless source is editable here
       when the role allows it — but a mirror added later without a link should
       still say something true rather than render an empty banner. */
    return { title: `${meta.title} is read-only here`, body: 'This source is edited elsewhere in the product.' };
  }

  /* Title and link only. "X lives in Bookings" beside a button that says
     "Edit X in Bookings" is the whole message; a paragraph explaining WHY the
     split exists is our reasoning, not the reader's problem. */
  return {
    title: `${meta.title} live in ${owner}`,
    href: meta.ownerHref,
    linkLabel: `Edit ${noun} in ${owner}`,
  };
}

/** The one-line version, for a card menu or a disabled control's tooltip. */
export function modeHint(source: SourceId, mode: EditMode): string | null {
  const notice = modeNotice(source, mode);
  return notice ? notice.title : null;
}

/**
 * Whether this module holds the writes for a mirror. The editable branch is
 * not dead code: a scaffold that took Knowledge Base without Bookings has no
 * other editor for services or staff at all.
 */
export const editsMirrorHere = (mode: EditMode): boolean => mode === 'edit';
