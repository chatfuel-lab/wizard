import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, parseKnowledgeParams, writeKnowledgeParams } from './knowledgeParams';

const parse = (query: string) => parseKnowledgeParams(new URLSearchParams(query));
const write = (query: string, next: Parameters<typeof writeKnowledgeParams>[1]) =>
  writeKnowledgeParams(new URLSearchParams(query), next).toString();

describe('parseKnowledgeParams', () => {
  it('falls back to the default source on an empty query', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
  });

  it('falls back silently on an unknown source', () => {
    expect(parse('source=nonsense').source).toBe('overview');
  });

  it('reads every key', () => {
    expect(parse('source=faq&item=abc&q=refund&import=products&draft=do%20you%20ship')).toEqual({
      source: 'faq',
      item: 'abc',
      q: 'refund',
      import: 'products',
      draft: 'do you ship',
    });
  });

  it('maps the retired tabs onto sources', () => {
    expect(parse('tab=business').source).toBe('profile');
    expect(parse('tab=faqs').source).toBe('faq');
    // The embed playbook documented `faq` while the code used `faqs`; both are honoured.
    expect(parse('tab=faq').source).toBe('faq');
    expect(parse('tab=catalog').source).toBe('products');
  });

  it('prefers an explicit source over a legacy tab', () => {
    expect(parse('source=gaps&tab=catalog').source).toBe('gaps');
  });

  it('treats an unknown import target as absent', () => {
    expect(parse('import=specialists').import).toBeNull();
  });
});

describe('writeKnowledgeParams', () => {
  it('omits the default source', () => {
    expect(write('', { ...DEFAULT_PARAMS })).toBe('');
  });

  it('writes only what is set', () => {
    expect(write('', { ...DEFAULT_PARAMS, source: 'faq', q: 'refund' })).toBe('source=faq&q=refund');
  });

  it('drops the retired tab key', () => {
    expect(write('tab=catalog', { ...DEFAULT_PARAMS, source: 'products' })).toBe('source=products');
  });

  it('leaves foreign keys alone', () => {
    expect(write('theme=dark', { ...DEFAULT_PARAMS, source: 'team' })).toBe('theme=dark&source=team');
  });

  it('treats a blank search as absent', () => {
    expect(write('', { ...DEFAULT_PARAMS, source: 'faq', q: '   ' })).toBe('source=faq');
  });
});
