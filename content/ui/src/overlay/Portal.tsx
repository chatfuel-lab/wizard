import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const PORTAL_ID = 'chatfuel-ui-portal';

/**
 * Single portal host for every floating surface.
 *
 * One node rather than one-per-overlay so an embed host has exactly one
 * element to scope, style or clean up. Everything anchored MUST go through
 * here: position:fixed breaks inside a transformed ancestor, and portalling to
 * the body is what guarantees there isn't one.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node = document.getElementById(PORTAL_ID);
    if (!node) {
      node = document.createElement('div');
      node.id = PORTAL_ID;
      /* The host itself must not lay anything out, and — load-bearing — must
       * NOT create a stacking context. `position: relative` with a z-index does
       * exactly that, and it traps every surface inside it: `z-popover` (60)
       * then competes with the page at the host's own z-index instead of its
       * own, so a `z-sticky` (10) table header paints straight over an open
       * popover. Left static, each surface is position:fixed and carries its
       * own rung of the ladder against the page, which is the whole point of
       * having a ladder. */
      document.body.appendChild(node);
    }
    setHost(node);
    /* Deliberately not removed on unmount: it is shared, and a second overlay
     * mounting during the first one's teardown would race for it. */
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
