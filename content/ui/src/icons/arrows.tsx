/* Chevrons and arrows, and the table and view controls they usually sit on. */
import { base, type IconProps } from './base';

export const IconChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconChevronUp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/* ── table and view controls ───────────────────────────────────────────── */

/** Ascending sort: the arrow points at where the smallest value goes. */
export const IconSortAsc = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
    <path d="M14 6h7M14 12h5M14 18h3" />
  </svg>
);

export const IconSortDesc = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M14 6h3M14 12h5M14 18h7" />
  </svg>
);

export const IconFilter = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
  </svg>
);

export const IconColumns = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M15 3v18" />
  </svg>
);

/** Table / list layout, the counterpart to IconKanban. */
export const IconLayoutList = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16" />
  </svg>
);

/** A grid of tiles — posts, a media library. */
export const IconLayoutGrid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

export const IconKanban = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 5v11" />
    <path d="M12 5v6" />
    <path d="M18 5v14" />
  </svg>
);

export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const IconPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 17v5" />
    <path d="M9 10.8V4h6v6.8l2.4 3.2a1 1 0 0 1-.8 1.6H7.4a1 1 0 0 1-.8-1.6L9 10.8Z" />
  </svg>
);
