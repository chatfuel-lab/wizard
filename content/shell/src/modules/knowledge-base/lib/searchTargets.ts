/**
 * The DOM contract between the workspace's keyboard/palette commands and
 * whichever page owns the matching control. A page applies an attribute to its
 * control via the spread idiom `{...{ [ATTR]: true }}`; the workspace finds it
 * with `querySelector(`[${ATTR}]`)` and focuses or clicks it. Both sides import
 * these constants so the two halves cannot drift apart.
 */

/** The DOM contract between the workspace's `/` command and whichever page owns a search box. */
export const SEARCH_ATTRIBUTE = 'data-knowledge-search';
/** The rail's own search box, used when the open page has none. */
export const RAIL_SEARCH_ATTRIBUTE = 'data-knowledge-rail-search';
/** The page's primary create button, so `n` and the palette can press it. */
export const CREATE_ATTRIBUTE = 'data-knowledge-create';
/** The page's export control — a menu trigger where there is a choice of format. */
export const EXPORT_ATTRIBUTE = 'data-knowledge-export';
