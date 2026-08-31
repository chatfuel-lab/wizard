import type { SVGProps } from 'react';

/**
 * Every icon takes the same props: any SVG attribute, plus `size` in px, which
 * sets both dimensions. Exported because a caller sometimes holds an icon as a
 * value rather than as an element — the run step picks its glyph from a
 * `Record<ToolFamily, ...>` — and typing that map needs a name for this.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Shared SVG attributes. Package-private: every icon spreads it, nothing else should. */
export function base({ size = 16, ...props }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}
