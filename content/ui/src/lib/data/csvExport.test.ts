import { describe, expect, it } from 'vitest';
import { CSV_BOM, csvEscape, csvText, safeFileName } from './csvExport';

describe('csvEscape', () => {
  it('escapes per RFC 4180 and neutralises formulas but not phones', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
    expect(csvEscape(30)).toBe('30');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('two\nlines')).toBe('"two\nlines"');
    expect(csvEscape(' padded ')).toBe('" padded "');
    expect(csvEscape('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvEscape('@cmd')).toBe("'@cmd");
    expect(csvEscape('-cmd|x')).toBe("'-cmd|x");
    expect(csvEscape('+12025550100')).toBe('+12025550100');
    expect(csvEscape('-5')).toBe('-5');
    expect(csvEscape('=1,2')).toBe(`"'=1,2"`);
  });
});

describe('csvText', () => {
  it('writes CRLF rows with a trailing newline, and no BOM of its own', () => {
    const header = ['Question', 'Answer'];
    expect(csvText([header])).toBe('Question,Answer\r\n');
    expect(csvText([header]).startsWith(CSV_BOM)).toBe(false);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
    expect(CSV_BOM).toHaveLength(1);

    const three = csvText([header, ['a', 'b'], ['c', 'd']]).split('\r\n');
    expect(three).toHaveLength(4); // header, 2 rows, trailing empty
    expect(three[3]).toBe('');
  });

  it('escapes every cell — prose with commas and quotes stays one field', () => {
    const csv = csvText([
      ['Question', 'Answer'],
      ['What size?', 'Small, medium, or "large".'],
    ]);
    expect(csv).toBe('Question,Answer\r\nWhat size?,"Small, medium, or ""large""."\r\n');
  });
});

describe('safeFileName', () => {
  it('leaves a readable name alone', () => {
    expect(safeFileName('contacts 2025.csv')).toBe('contacts 2025.csv');
    expect(safeFileName('Q3_report-final.csv')).toBe('Q3_report-final.csv');
  });

  it('collapses anything that would leave the download directory', () => {
    expect(safeFileName('../../etc/passwd')).toBe('-..-etc-passwd');
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j.csv')).toBe('a-b-c-d-e-f-g-h-i-j.csv');
    expect(safeFileName('.hidden')).toBe('hidden');
  });

  it('falls back rather than hand the OS a name it will argue about', () => {
    expect(safeFileName('   ')).toBe('download');
    expect(safeFileName('...')).toBe('download');
    expect(safeFileName('CON.csv')).toBe('download');
    expect(safeFileName('', 'export.csv')).toBe('export.csv');
  });

  it('caps the length', () => {
    expect(safeFileName('x'.repeat(400))).toHaveLength(200);
  });
});
