import { describe, expect, it } from 'vitest';
import { getDocMeta } from '~api';
import { Platform } from '~api/generated/flow-builder/graphql';
import { clickDocumentFor, clickInput, sendDocumentFor } from './testDocs';
import type { ClickKind } from './testRows';

const CLICK_KINDS: readonly ClickKind[] = [
  'widget-continue',
  'widget-url',
  'widget-phone',
  'wa-continue',
  'wa-quick-reply',
  'wa-list-row',
];

describe('sendDocumentFor', () => {
  it('answers a mutation and its result key for every schema platform', () => {
    for (const platform of Object.values(Platform)) {
      const wire = sendDocumentFor(platform);
      expect(wire).not.toBeNull();
      expect(getDocMeta(wire!.document).kind).toBe('mutation');
      /* The result key is how the echoed message is dug out of the response —
         it has to name a field the document actually selects. */
      expect(getDocMeta(wire!.document).text).toContain(wire!.resultKey);
    }
  });

  it('answers null for a platform the schema grew after this file', () => {
    expect(sendDocumentFor('carrier-pigeon')).toBeNull();
  });
});

describe('clickDocumentFor', () => {
  it('answers a mutation and its result key for every click kind', () => {
    for (const kind of CLICK_KINDS) {
      const wire = clickDocumentFor(kind);
      expect(getDocMeta(wire.document).kind).toBe('mutation');
      expect(getDocMeta(wire.document).text).toContain(wire.resultKey);
    }
  });
});

describe('clickInput', () => {
  it('addresses a list row by rowTitle and everything else by buttonTitle', () => {
    expect(clickInput('wa-list-row', 'msg-1', 'Row', 'client-1')).toEqual({
      messageId: 'msg-1',
      clientId: 'client-1',
      rowTitle: 'Row',
    });
    expect(clickInput('widget-continue', 'msg-1', 'Next', 'client-1')).toEqual({
      messageId: 'msg-1',
      clientId: 'client-1',
      buttonTitle: 'Next',
    });
    expect(clickInput('wa-quick-reply', 'msg-2', 'Yes', 'client-2')).toEqual({
      messageId: 'msg-2',
      clientId: 'client-2',
      buttonTitle: 'Yes',
    });
  });
});
