/**
 * The assistant's face on an empty screen, drawn in text.
 *
 * An empty conversation needs *something* — a page with a sentence and a box on
 * it reads as unfinished — but almost everything that could go there is worse
 * than nothing. An illustration is a mood the product does not have. A large
 * version of the nav icon is the same glyph twice on one screen. A photograph
 * belongs to a marketing page.
 *
 * So: characters. It is the one kind of picture a console can draw without
 * pretending to be something else, it costs no asset and no request, it is
 * sharp at every zoom and in every theme, and it says what this surface is
 * before a word does — you are about to type at something.
 *
 * Built as a fixed grid of monospace cells so it cannot reflow, marked
 * `aria-hidden` because it says nothing a screen reader needs, and faded in
 * only for readers who did not ask for less motion.
 */

/** Every line is the same length; a ragged one shears the whole figure. */
const LINES = ['·     ·     ·', '   ╲  │  ╱   ', '·  ─  ✳  ─  ·', '   ╱  │  ╲   ', '·     ·     ·'];

/** The line the centre glyph sits on, split so it alone can carry the accent. */
const CENTRE = 2;
const GLYPH = '✳';

export function AsciiMark() {
  return (
    <pre
      aria-hidden
      className="select-none text-center font-mono text-label leading-tight text-text-faint motion-safe:animate-fade-in"
    >
      {LINES.map((line, index) => {
        if (index !== CENTRE) return `${line}\n`;
        const at = line.indexOf(GLYPH);
        return (
          <span key={index}>
            {line.slice(0, at)}
            <span className="text-accent">{GLYPH}</span>
            {line.slice(at + GLYPH.length)}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}
