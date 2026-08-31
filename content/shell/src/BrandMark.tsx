import { APP_LOGO, APP_NAME } from './lib/brand';

/**
 * The product's mark in the top bar: which app this is, above the question of
 * which account it is pointed at.
 *
 * `alt=""` — the name is right next to it in text, so a screen reader that also
 * announced the image would say the same thing twice. Below `sm` the name is
 * dropped and the mark carries it alone: at those widths the nav has already
 * collapsed into a hamburger and the workspace pickers need every pixel of the
 * bar they can get.
 */
export function BrandMark() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <img src={APP_LOGO} alt="" className="h-6 w-auto max-w-24 shrink-0 rounded-[6px] object-contain" />
      <span className="hidden truncate text-body font-semibold sm:inline">{APP_NAME}</span>
    </div>
  );
}
