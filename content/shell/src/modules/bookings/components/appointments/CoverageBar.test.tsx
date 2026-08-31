import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoverageBar } from './CoverageBar';

/**
 * The bar takes the view's whole `FormatOptions`, not just its `todayKey`: the
 * counts and the dates it prints have to read the way every other number in
 * the table reads, and a bar that builds its own options silently loses the locale.
 */
describe('CoverageBar', () => {
  const render = (locale?: string) =>
    renderToStaticMarkup(
      <CoverageBar
        range="upcoming"
        window={{ startKey: '2026-08-17', endKey: '2026-08-24' }}
        loaded={1234}
        shown={1200}
        chunks={1}
        onLoadMore={() => undefined}
        loading={false}
        capped={false}
        format={{ todayKey: '2026-08-17', locale }}
      />,
    );

  it('threads the locale into every count it prints', () => {
    const de = render('de-DE');
    expect(de).toContain('1.234');
    expect(de).toContain('1.200');
    const en = render('en-US');
    expect(en).toContain('1,234');
    expect(en).toContain('1,200');
  });
});
