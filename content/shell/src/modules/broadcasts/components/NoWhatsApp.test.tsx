import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoWhatsApp } from './NoWhatsApp';

describe('a bot with no WhatsApp number', () => {
  it('is told so, with the way to connect one when the deployment has it', () => {
    const html = renderToStaticMarkup(<NoWhatsApp onConnect={() => undefined} />);
    expect(html).toContain('No WhatsApp number is connected');
    expect(html).toContain('Connect WhatsApp');
  });

  it('is told so, and nothing to press, when it has not', () => {
    const html = renderToStaticMarkup(<NoWhatsApp onConnect={null} />);
    expect(html).toContain('No WhatsApp number is connected');
    expect(html).not.toContain('Connect WhatsApp');
  });
});
