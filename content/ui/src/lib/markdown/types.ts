export type MarkdownSpan =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; spans: MarkdownSpan[] }
  | { kind: 'em'; spans: MarkdownSpan[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; spans: MarkdownSpan[] };

export interface MarkdownListItem {
  spans: MarkdownSpan[];
  /** One level of nesting, and only one — deeper indentation folds into it. */
  child?: MarkdownList;
}

export interface MarkdownList {
  ordered: boolean;
  /** First number of an ordered list. `3.` starts at 3, like the source says. */
  start: number;
  items: MarkdownListItem[];
}

export type TableAlign = 'start' | 'center' | 'end';

export type MarkdownBlock =
  | { kind: 'paragraph'; spans: MarkdownSpan[] }
  | { kind: 'heading'; level: 1 | 2 | 3; spans: MarkdownSpan[] }
  | { kind: 'list'; list: MarkdownList }
  | { kind: 'quote'; blocks: MarkdownBlock[] }
  /** `closed` is false while the fence is still open — see rule 1 in the module header. */
  | { kind: 'code'; language: string | null; code: string; closed: boolean }
  | { kind: 'table'; header: MarkdownSpan[][] | null; align: TableAlign[]; rows: MarkdownSpan[][][] }
  | { kind: 'rule' };
