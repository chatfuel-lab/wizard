import { describe, expect, it } from 'vitest';
import {
  markdownToPlainText,
  parseInline,
  parseMarkdown,
  safeAppHref,
  safeHref,
  type MarkdownBlock,
  type MarkdownSpan,
} from './index';

/** The words a span tree carries, so an assertion can be about structure or text. */
function text(spans: MarkdownSpan[]): string {
  return spans.map((span) => (span.kind === 'text' || span.kind === 'code' ? span.text : text(span.spans))).join('');
}

function kinds(blocks: MarkdownBlock[]): string[] {
  return blocks.map((block) => block.kind);
}

describe('safeHref', () => {
  it('takes the four schemes a message may link to', () => {
    expect(safeHref('https://docs.chatfuel.com/x')).toBe('https://docs.chatfuel.com/x');
    expect(safeHref('http://example.com/')).toBe('http://example.com/');
    expect(safeHref('mailto:ada@example.com')).toBe('mailto:ada@example.com');
    expect(safeHref('tel:+15550100')).toBe('tel:+15550100');
  });

  it('refuses a script target however it is spelled', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeHref('  javascript:alert(1)')).toBeNull();
    /* The URL parser ignores a tab inside the scheme; so a check that only
       looked at the prefix would pass this one straight through. */
    expect(safeHref('java\tscript:alert(1)')).toBeNull();
    expect(safeHref('java\nscript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
  });

  it('refuses a relative target — it would resolve against the dashboard', () => {
    expect(safeHref('/settings/billing?confirm=1')).toBeNull();
    expect(safeHref('../admin')).toBeNull();
    expect(safeHref('#anchor')).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
  });
});

describe('parseInline', () => {
  it('reads the four inline forms', () => {
    expect(parseInline('**bold**')).toEqual([{ kind: 'strong', spans: [{ kind: 'text', text: 'bold' }] }]);
    expect(parseInline('*italic*')).toEqual([{ kind: 'em', spans: [{ kind: 'text', text: 'italic' }] }]);
    expect(parseInline('`code`')).toEqual([{ kind: 'code', text: 'code' }]);
    expect(parseInline('[docs](https://example.com)')).toEqual([
      { kind: 'link', href: 'https://example.com/', spans: [{ kind: 'text', text: 'docs' }] },
    ]);
  });

  it('nests emphasis inside emphasis', () => {
    expect(parseInline('***both***')).toEqual([
      { kind: 'strong', spans: [{ kind: 'em', spans: [{ kind: 'text', text: 'both' }] }] },
    ]);
    const mixed = parseInline('**bold with `code`**');
    expect(mixed).toHaveLength(1);
    expect(mixed[0]!.kind).toBe('strong');
    expect(text(mixed)).toBe('bold with code');
  });

  it('leaves snake_case alone — the text is full of tool ids', () => {
    const spans = parseInline('call chatfuel_gql-create_service now');
    expect(spans).toEqual([{ kind: 'text', text: 'call chatfuel_gql-create_service now' }]);
  });

  it('still italicises an underscore run that stands on its own', () => {
    expect(parseInline('an _emphatic_ word')).toEqual([
      { kind: 'text', text: 'an ' },
      { kind: 'em', spans: [{ kind: 'text', text: 'emphatic' }] },
      { kind: 'text', text: ' word' },
    ]);
  });

  it('keeps a backslash-escaped delimiter as a character', () => {
    expect(parseInline('2 \\* 3 \\* 4')).toEqual([{ kind: 'text', text: '2 * 3 * 4' }]);
    expect(parseInline('\\`not code\\`')).toEqual([{ kind: 'text', text: '`not code`' }]);
  });

  it('renders a link it will not follow as its own words', () => {
    expect(parseInline('[click me](javascript:alert(1))')).toEqual([{ kind: 'text', text: 'click me' }]);
  });

  it('drops a link title rather than folding it into the href', () => {
    expect(parseInline('[d](https://example.com "the docs")')).toEqual([
      { kind: 'link', href: 'https://example.com/', spans: [{ kind: 'text', text: 'd' }] },
    ]);
  });

  it('renders an image as its alt text and fetches nothing', () => {
    expect(parseInline('before ![a chart](https://cdn.example.com/x.png) after')).toEqual([
      { kind: 'text', text: 'before a chart after' },
    ]);
  });

  it('treats raw HTML as the characters it is', () => {
    expect(parseInline('<b>x</b>')).toEqual([{ kind: 'text', text: '<b>x</b>' }]);
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
  });

  it('holds a backtick inside a longer run', () => {
    expect(parseInline('`` ` ``')).toEqual([{ kind: 'code', text: '`' }]);
  });
});

/* Every case here is one frame of a stream: the same message, one prefix
   shorter. What must not happen is a prefix rendering as something structurally
   different from the prefix before it. */
describe('parseMarkdown while the text is still arriving', () => {
  it('renders an unmatched bold run as its own characters', () => {
    expect(text((parseMarkdown('**bo')[0] as { spans: MarkdownSpan[] }).spans)).toBe('**bo');
    expect(text((parseMarkdown('a **bo')[0] as { spans: MarkdownSpan[] }).spans)).toBe('a **bo');
    /* And only when it closes does it become bold — one transition, not two. */
    const closed = parseMarkdown('a **bold**')[0] as { spans: MarkdownSpan[] };
    expect(closed.spans[1]!.kind).toBe('strong');
  });

  it('treats an unterminated fence as a code block, never as prose', () => {
    const blocks = parseMarkdown('```json\n{ "a": 1');
    expect(blocks).toEqual([{ kind: 'code', language: 'json', code: '{ "a": 1', closed: false }]);
  });

  it('keeps the same code block once the fence closes', () => {
    const open = parseMarkdown('```json\n{ "a": 1 }');
    const closed = parseMarkdown('```json\n{ "a": 1 }\n```');
    expect(kinds(open)).toEqual(kinds(closed));
    expect(open[0]).toMatchObject({ code: '{ "a": 1 }', closed: false });
    expect(closed[0]).toMatchObject({ code: '{ "a": 1 }', closed: true });
  });

  it('opens a fence with no language and no body at all', () => {
    expect(parseMarkdown('```')).toEqual([{ kind: 'code', language: null, code: '', closed: false }]);
  });

  it('lays a table out from its first row, before the delimiter proves it is one', () => {
    const first = parseMarkdown('| Service | Price |');
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ kind: 'table', header: null });
    expect((first[0] as { rows: MarkdownSpan[][][] }).rows.map((row) => row.map(text))).toEqual([['Service', 'Price']]);

    /* The delimiter row promotes row 0 to a header. The cells do not move. */
    const withHeader = parseMarkdown('| Service | Price |\n|---|---:|');
    expect(withHeader[0]).toMatchObject({ align: ['start', 'end'] });
    expect((withHeader[0] as { header: MarkdownSpan[][] }).header.map(text)).toEqual(['Service', 'Price']);
  });

  it('accepts a row whose last cell is still being typed', () => {
    const blocks = parseMarkdown('| Service | Price |\n|---|---|\n| Haircut | 30');
    expect((blocks[0] as { rows: MarkdownSpan[][][] }).rows.map((row) => row.map(text))).toEqual([['Haircut', '30']]);
  });

  it('does not flicker a lone hyphen through a bullet on its way to a rule', () => {
    /* A marker needs a space after it, so no prefix of a rule is ever a list —
       which is the pair that would otherwise swap a bullet for a divider and
       back on consecutive tokens. */
    expect(kinds(parseMarkdown('-'))).toEqual(['paragraph']);
    expect(kinds(parseMarkdown('--'))).toEqual(['paragraph']);
    expect(kinds(parseMarkdown('---'))).toEqual(['rule']);
    /* The space commits it to a list, empty item and all — the same block kind
       the next character produces, so nothing restructures. */
    expect(kinds(parseMarkdown('- '))).toEqual(['list']);
    expect(kinds(parseMarkdown('- a'))).toEqual(['list']);
  });

  it('never restructures a prefix of a real answer into a different block list', () => {
    const answer = [
      '## Two things',
      '',
      'First, **check** the `botId`:',
      '',
      '```json',
      '{ "botId": "abc" }',
      '```',
      '',
      '- one',
      '- two',
    ].join('\n');

    /* The invariant: block kinds only ever grow at the end. A prefix must never
       change the kind of a block an earlier prefix had already settled. */
    let previous: string[] = [];
    for (let length = 1; length <= answer.length; length += 1) {
      const current = kinds(parseMarkdown(answer.slice(0, length)));
      const settled = previous.slice(0, Math.max(previous.length - 1, 0));
      expect(current.slice(0, settled.length)).toEqual(settled);
      previous = current;
    }
  });
});

describe('parseMarkdown blocks', () => {
  it('reads headings, and clamps deeper ones to the three sizes this has', () => {
    expect(parseMarkdown('# One')[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(parseMarkdown('### Three')[0]).toMatchObject({ kind: 'heading', level: 3 });
    expect(parseMarkdown('##### Five')[0]).toMatchObject({ kind: 'heading', level: 3 });
    expect(text((parseMarkdown('## Title ##')[0] as { spans: MarkdownSpan[] }).spans)).toBe('Title');
    /* No space after the hashes is a hashtag, not a heading. */
    expect(kinds(parseMarkdown('#nottitle'))).toEqual(['paragraph']);
  });

  it('does not let a bullet be swallowed by the sentence above it', () => {
    const blocks = parseMarkdown('Here is what I found:\n- one\n- two');
    expect(kinds(blocks)).toEqual(['paragraph', 'list']);
    const list = (blocks[1] as { list: { items: { spans: MarkdownSpan[] }[] } }).list;
    expect(list.items.map((item) => text(item.spans))).toEqual(['one', 'two']);
  });

  it('keeps an ordered list starting where the source says', () => {
    const blocks = parseMarkdown('3. three\n4. four');
    expect(blocks[0]).toMatchObject({ kind: 'list', list: { ordered: true, start: 3 } });
  });

  it('nests one level and folds anything deeper into it', () => {
    const blocks = parseMarkdown('- top\n  - child\n      - grandchild\n- second');
    const list = (
      blocks[0] as {
        list: { items: { spans: MarkdownSpan[]; child?: { items: { spans: MarkdownSpan[] }[] } }[] };
      }
    ).list;
    expect(list.items).toHaveLength(2);
    expect(list.items[0]!.child!.items.map((item) => text(item.spans))).toEqual(['child', 'grandchild']);
    expect(text(list.items[1]!.spans)).toBe('second');
  });

  it('splits a bullet list touching a numbered one into two lists', () => {
    expect(kinds(parseMarkdown('- a\n1. b'))).toEqual(['list', 'list']);
  });

  it('joins a wrapped list item back onto its own line', () => {
    const blocks = parseMarkdown('- a long item\n  that wrapped');
    const list = (blocks[0] as { list: { items: { spans: MarkdownSpan[] }[] } }).list;
    expect(text(list.items[0]!.spans)).toBe('a long item\nthat wrapped');
  });

  it('parses a quote as blocks, not as one lump of text', () => {
    const blocks = parseMarkdown('> **Note**\n> - one');
    expect(blocks).toHaveLength(1);
    expect(kinds((blocks[0] as { blocks: MarkdownBlock[] }).blocks)).toEqual(['paragraph', 'list']);
  });

  it('stops nesting quotes rather than recursing forever', () => {
    const blocks = parseMarkdown('> > > > > deep');
    expect(blocks[0]!.kind).toBe('quote');
    /* Whatever the depth, it terminates and the words survive. */
    expect(markdownToPlainText('> > > > > deep')).toBe('> > deep');
  });

  it('reads a horizontal rule written three ways', () => {
    expect(kinds(parseMarkdown('---\n***\n___'))).toEqual(['rule', 'rule', 'rule']);
  });

  it('treats blank lines as separators and emits nothing for them', () => {
    expect(kinds(parseMarkdown('a\n\n\n\nb'))).toEqual(['paragraph', 'paragraph']);
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n  \n')).toEqual([]);
  });

  it('normalises Windows line endings', () => {
    expect(kinds(parseMarkdown('a\r\n\r\nb'))).toEqual(['paragraph', 'paragraph']);
  });
});

describe('markdownToPlainText', () => {
  it('gives the words back without the markup', () => {
    expect(markdownToPlainText('## Title\n\nSome **bold** and `code`.')).toBe('Title Some bold and code.');
  });

  it('does not leave list bullets or table pipes behind', () => {
    expect(markdownToPlainText('- one\n- two')).toBe('one two');
    expect(markdownToPlainText('| a | b |\n|---|---|\n| 1 | 2 |')).toBe('a b 1 2');
  });

  it('keeps the contents of a code block, which is usually the answer', () => {
    expect(markdownToPlainText('```json\n{ "a": 1 }\n```')).toBe('{ "a": 1 }');
  });
});

describe('safeAppHref', () => {
  it('keeps the in-app targets safeHref deliberately rejects', () => {
    expect(safeAppHref('/contacts/42')).toBe('/contacts/42');
    expect(safeAppHref('/a?b=1#c')).toBe('/a?b=1#c');
    expect(safeAppHref('#tab')).toBe('#tab');
    expect(safeAppHref('?page=2')).toBe('?page=2');
    expect(safeAppHref('https://ok.example/')).toBe('https://ok.example/');
  });

  it('still refuses a scheme, and a protocol-relative host that reads like a path', () => {
    expect(safeAppHref('javascript:alert(1)')).toBeNull();
    expect(safeAppHref('java\tscript:alert(1)')).toBeNull();
    expect(safeAppHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeAppHref('//evil.example/x')).toBeNull();
    expect(safeAppHref('  ')).toBeNull();
  });

  it('counts a backslash as the slash the URL parser reads it as', () => {
    /* Each of these resolves to https://evil.example/ from any page of the app
       — the same navigation '//evil.example' makes, spelled to get past a
       check that only looked for two forward slashes. */
    expect(safeAppHref('/\\evil.example/x')).toBeNull();
    expect(safeAppHref('\\\\evil.example/x')).toBeNull();
    expect(safeAppHref('\\/evil.example')).toBeNull();
    expect(safeAppHref('/\\\\evil.example')).toBeNull();
    // One backslash is a path segment, and paths are what this is for.
    expect(safeAppHref('/contacts\\42')).toBe('/contacts\\42');
  });
});

describe('parse cost', () => {
  /* Every one of these was quadratic: a forward scan per opener, over text
     with many openers and no closers. At 64k characters they cost seconds
     EACH, on a parse that re-runs on every frame of a stream — a message a
     contact can paste froze the operator's tab. The budget is loose on
     purpose; it is two orders of magnitude under what the regression was, so
     it catches the shape without failing on a slow machine. */
  const shapes: Record<string, string> = {
    'unmatched brackets': '['.repeat(64000),
    'unmatched labels': '[x'.repeat(32000),
    'unmatched images': '!['.repeat(32000),
    'label with no closing paren': '[a](b'.repeat(12800),
    'underscore that never closes': ' _a'.repeat(21000),
  };

  for (const [name, input] of Object.entries(shapes)) {
    it(`stays linear on ${name}`, () => {
      const started = Date.now();
      parseInline(input);
      expect(Date.now() - started).toBeLessThan(500);
    });
  }
});
