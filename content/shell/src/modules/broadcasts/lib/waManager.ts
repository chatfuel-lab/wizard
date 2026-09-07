/**
 * The hand-off for a new template.
 *
 * Nothing in the API authors a WhatsApp template — Meta does, in WhatsApp
 * Manager, against the WhatsApp Business Account the bot's number belongs to.
 * So "New template" is a door, not a form: the app opens Meta's page on that
 * account, and the catalog picks the template up once Meta approves it
 * (`BroadcastTemplatesRefetch` asks the server to look sooner).
 */
const WA_MANAGER = 'https://business.facebook.com/wa/manage/home/';

export function whatsAppManagerUrl(wabaId: string, businessId: string): string {
  const params = new URLSearchParams({ waba_id: wabaId, business_id: businessId });
  return `${WA_MANAGER}?${params.toString()}`;
}
