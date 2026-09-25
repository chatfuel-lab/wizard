import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from '~ui';
import type { AiModelApi } from '../../hooks/useAiModel';
import { AiModelView } from './AiModelCard';

/* The card from frozen hook answers: what each state shows, and what a role
   without Configure · Edit is and is not offered. */
const api = (over: Partial<AiModelApi> = {}): AiModelApi => ({
  current: null,
  options: [
    { model: 'gpt-5.4-mini-2026-03-17', isDefault: true },
    { model: 'gpt-5.5-2026-04-23', isDefault: false },
  ],
  loading: false,
  error: null,
  saving: false,
  reload: () => undefined,
  save: async () => undefined,
  ...over,
});

const draw = (ai: AiModelApi, canChange: boolean) =>
  renderToStaticMarkup(
    <ToastProvider>
      <AiModelView ai={ai} canChange={canChange} />
    </ToastProvider>,
  );

describe('AiModelView', () => {
  it('lists the models with their prices and marks the default', () => {
    const html = draw(api(), true);
    expect(html).toContain('GPT-5.4 Mini · default');
    expect(html).toContain('GPT-5.5');
    expect(html).toContain('Input US$5.50 · Output US$33.00 / 1M tokens');
    expect(html).toContain('Save model');
  });

  it('shows the model in use to a role that cannot change it, and no Save', () => {
    const html = draw(api({ current: 'gpt-5.5-2026-04-23' }), false);
    expect(html).toContain('GPT-5.5');
    expect(html).not.toContain('Save model');
    expect(html).toContain('Configure · Edit');
  });

  it('keeps a model an admin set by hand on screen, by its id', () => {
    const html = draw(api({ current: 'gpt-9-custom' }), true);
    expect(html).toContain('gpt-9-custom');
    expect(html).toContain('Input – · Output – / 1M tokens');
  });

  it('says so and offers a retry when the model could not be read', () => {
    const html = draw(api({ error: 'boom', options: [] }), true);
    expect(html).toContain('The model could not be read');
    expect(html).toContain('Retry');
  });
});
