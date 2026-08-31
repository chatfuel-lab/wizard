import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError, getDocMeta } from '~api';
import {
  clampDockSize,
  DEFAULT_DOCK_SIZE,
  DEFAULT_DOCK_STATE,
  dockInset,
  DOCK_STATE_KEY,
  isNoStartingPoint,
  MIN_DOCK_SIZE,
  NO_STARTING_POINT,
  readDockState,
  testErrorMessage,
  writeDockState,
  type DockStorage,
} from './testDock';
import { clickDocumentFor, clickInput, sendDocumentFor } from './testDocs';

const storage = (seed: Record<string, string> = {}): DockStorage & { map: Map<string, string> } => {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
};

describe('what the device remembers', () => {
  it('answers the default when there is nothing, no storage, or garbage', () => {
    expect(readDockState(undefined)).toEqual(DEFAULT_DOCK_STATE);
    expect(readDockState(storage())).toEqual(DEFAULT_DOCK_STATE);
    expect(readDockState(storage({ [DOCK_STATE_KEY]: 'not json' }))).toEqual(DEFAULT_DOCK_STATE);
    expect(readDockState(storage({ [DOCK_STATE_KEY]: 'null' }))).toEqual(DEFAULT_DOCK_STATE);
    expect(readDockState(storage({ [DOCK_STATE_KEY]: '{"open":"yes"}' }))).toEqual(DEFAULT_DOCK_STATE);
  });
  it('round-trips a state it wrote', () => {
    const s = storage();
    writeDockState(s, { open: false, size: { width: 400, height: 520 } });
    expect(readDockState(s)).toEqual({ open: false, size: { width: 400, height: 520 } });
  });
  it('clamps a remembered size that is under the minimum', () => {
    const s = storage({ [DOCK_STATE_KEY]: JSON.stringify({ open: true, size: { width: 10, height: 10 } }) });
    expect(readDockState(s).size).toEqual(MIN_DOCK_SIZE);
    expect(clampDockSize({ width: 400.6, height: 520.2 })).toEqual({ width: 401, height: 520 });
  });
  it('a storage that throws costs a preference, never a render', () => {
    const hostile: DockStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readDockState(hostile)).toEqual(DEFAULT_DOCK_STATE);
    expect(() => writeDockState(hostile, DEFAULT_DOCK_STATE)).not.toThrow();
  });
  it('the fit inset is the dock plus both gutters', () => {
    expect(dockInset(DEFAULT_DOCK_SIZE)).toBe(DEFAULT_DOCK_SIZE.width + 24);
  });
});

describe('why a start was refused', () => {
  const graphError = (code: string) => new ChatfuelGraphQLError([{ message: 'nope', extensions: { code } }]);

  it('names the two refusals a person can act on', () => {
    expect(testErrorMessage(graphError(NO_STARTING_POINT))).toMatch(/no starting point/);
    expect(testErrorMessage(graphError('ScopeNotConnectedToBot'))).toMatch(/not connected/);
  });
  it('falls back to the error itself, then to the fallback', () => {
    expect(testErrorMessage(new Error('boom'))).toBe('boom');
    expect(testErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(testErrorMessage(null, 'fallback')).toBe('fallback');
  });
  it('recognises the no-starting-point SENTENCE, which is all the state machine keeps', () => {
    expect(isNoStartingPoint(testErrorMessage(graphError(NO_STARTING_POINT)))).toBe(true);
    expect(isNoStartingPoint(testErrorMessage(graphError('ScopeNotConnectedToBot')))).toBe(false);
    expect(isNoStartingPoint(null)).toBe(false);
  });
});

describe('which document a send goes through', () => {
  it('picks a text mutation by the flow’s platform, and nothing for an unknown one', () => {
    expect(getDocMeta(sendDocumentFor('widget')!.document as never).name).toBe('FlowTestWidgetTextSend');
    expect(sendDocumentFor('widget')!.resultKey).toBe('previewResponsesWidgetTextSend');
    expect(getDocMeta(sendDocumentFor('whatsapp')!.document as never).name).toBe('FlowTestWhatsAppTextSend');
    expect(sendDocumentFor('whatsapp')!.resultKey).toBe('previewResponsesWhatsappTextSend');
    expect(getDocMeta(sendDocumentFor('instagram')!.document as never).name).toBe('FlowTestInstagramTextSend');
    expect(getDocMeta(sendDocumentFor('tiktok')!.document as never).name).toBe('FlowTestTikTokTextSend');
    expect(sendDocumentFor('tiktok')!.resultKey).toBe('previewResponsesTikTokTextSend');
    expect(getDocMeta(sendDocumentFor('facebook')!.document as never).name).toBe('FlowTestFacebookTextSend');
    expect(sendDocumentFor('threads')).toBeNull();
    expect(sendDocumentFor('')).toBeNull();
  });
  it('picks a click mutation by the button’s kind', () => {
    expect(getDocMeta(clickDocumentFor('widget-continue').document as never).name).toBe(
      'FlowTestWidgetContinueFlowClick',
    );
    expect(getDocMeta(clickDocumentFor('widget-url').document as never).name).toBe('FlowTestWidgetOpenURLClick');
    expect(getDocMeta(clickDocumentFor('widget-phone').document as never).name).toBe('FlowTestWidgetCallPhoneClick');
    expect(getDocMeta(clickDocumentFor('wa-continue').document as never).name).toBe(
      'FlowTestWhatsAppContinueFlowClick',
    );
    expect(getDocMeta(clickDocumentFor('wa-quick-reply').document as never).name).toBe(
      'FlowTestWhatsAppTemplateQuickReplyClick',
    );
    expect(getDocMeta(clickDocumentFor('wa-list-row').document as never).name).toBe('FlowTestWhatsAppListRowClick');
  });
  it('addresses a list row by rowTitle and everything else by buttonTitle', () => {
    expect(clickInput('wa-list-row', 'm1', 'Thu 17:00', 'c1')).toEqual({
      messageId: 'm1',
      clientId: 'c1',
      rowTitle: 'Thu 17:00',
    });
    expect(clickInput('wa-continue', 'm1', 'Book', 'c1')).toEqual({
      messageId: 'm1',
      clientId: 'c1',
      buttonTitle: 'Book',
    });
  });
});
