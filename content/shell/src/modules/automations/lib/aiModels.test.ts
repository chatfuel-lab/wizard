import { describe, expect, it } from 'vitest';
import { effectiveModel, listedModels, modelLabel, modelPrice, saveAction, type AiModelOption } from './aiModels';

const options: AiModelOption[] = [
  { model: 'gpt-5.4-nano-2026-03-17', isDefault: false },
  { model: 'gpt-5.4-mini-2026-03-17', isDefault: true },
  { model: 'gpt-5.5-2026-04-23', isDefault: false },
];

describe('model labels and prices', () => {
  it('names a known model and prices it per million tokens', () => {
    expect(modelLabel('gpt-5.4-mini-2026-03-17')).toBe('GPT-5.4 Mini');
    expect(modelPrice('gpt-5.4-mini-2026-03-17')).toBe('Input US$0.83 · Output US$4.95 / 1M tokens');
  });

  it('prints an unknown id as itself, with no invented price', () => {
    expect(modelLabel('gpt-9-custom')).toBe('gpt-9-custom');
    expect(modelPrice('gpt-9-custom')).toBe('Input – · Output – / 1M tokens');
  });
});

describe('what is in use and what is listed', () => {
  it('falls back to the default when the bot has no model of its own', () => {
    expect(effectiveModel(null, options)).toBe('gpt-5.4-mini-2026-03-17');
    expect(effectiveModel('gpt-5.5-2026-04-23', options)).toBe('gpt-5.5-2026-04-23');
    expect(effectiveModel(null, [])).toBeNull();
  });

  it('keeps a hand-set model on screen, first', () => {
    expect(listedModels('gpt-9-custom', options)).toEqual(['gpt-9-custom', ...options.map((o) => o.model)]);
    expect(listedModels('gpt-5.5-2026-04-23', options)).toEqual(options.map((o) => o.model));
    expect(listedModels(null, options)).toEqual(options.map((o) => o.model));
  });
});

describe('saveAction', () => {
  it('does nothing when the pick is already in use', () => {
    expect(saveAction(null, 'gpt-5.4-mini-2026-03-17', options)).toBe('none');
    expect(saveAction('gpt-5.5-2026-04-23', 'gpt-5.5-2026-04-23', options)).toBe('none');
  });

  it('unsets to go back to the default, rather than pinning it', () => {
    expect(saveAction('gpt-5.5-2026-04-23', 'gpt-5.4-mini-2026-03-17', options)).toBe('unset');
  });

  it('sets anything else', () => {
    expect(saveAction(null, 'gpt-5.5-2026-04-23', options)).toBe('set');
    expect(saveAction('gpt-5.5-2026-04-23', 'gpt-5.4-nano-2026-03-17', options)).toBe('set');
  });
});
