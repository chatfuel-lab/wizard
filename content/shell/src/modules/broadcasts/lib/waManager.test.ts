import { describe, expect, it } from 'vitest';
import { whatsAppManagerUrl } from './waManager';

describe('the WhatsApp Manager door', () => {
  it('opens on the account the number belongs to', () => {
    expect(whatsAppManagerUrl('130930', '161774')).toBe(
      'https://business.facebook.com/wa/manage/home/?waba_id=130930&business_id=161774',
    );
  });

  it('escapes what it is handed', () => {
    expect(whatsAppManagerUrl('a&b', 'c d')).toContain('waba_id=a%26b&business_id=c+d');
  });
});
