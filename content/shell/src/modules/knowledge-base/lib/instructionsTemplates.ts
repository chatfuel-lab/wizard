/**
 * Starter texts for `additionalInstructions`.
 *
 * The field's name on the wire is a leftover and it misleads: the BEHAVIOUR
 * prompt - who the assistant is, how long its replies are, when it hands over -
 * moved to the per-scope automation settings, and what is left on the knowledge
 * base is the free-text half of the business itself. Everything a customer
 * might ask that does not fit a profile field, an FAQ row or a catalog item:
 * how you work, what you will not do, the quirks somebody has to know before
 * they promise something on your behalf.
 *
 * So the four headings are the four questions a new employee asks on their
 * first day, not a prompt-engineering ritual. "We are friendly and
 * professional" is not information; "we cannot take dogs after 6pm because the
 * groomer leaves" is.
 *
 * `instructionsTemplates.test.ts` runs every template through the module's own
 * lint and fails if any of them raises a finding - a shipped starter that trips
 * the module's own lint would be a self-inflicted defect. That is also
 * why no template carries a price list: prices belong in the catalog, where
 * they can be edited one at a time.
 */
import type { SourceId } from './sources';

export interface InstructionsTemplate {
  id: string;
  name: string;
  /** The line under the name in the picker: who this is for. */
  forWhom: string;
  body: string;
}

/** The four headings every starter uses; the test asserts they are all present. */
export const TEMPLATE_SECTIONS: readonly string[] = ['What we do', 'How we work', 'What we do not do', 'Worth knowing'];

export const INSTRUCTIONS_TEMPLATES: readonly InstructionsTemplate[] = [
  {
    id: 'salon',
    name: 'Salon and beauty',
    forWhom: 'Hair, nails, brows — appointments and the rules around them.',
    body: [
      'What we do',
      'A neighbourhood salon. Cuts, colour and treatments, by appointment; we keep a couple of slots each day for walk-ins.',
      '',
      'How we work',
      '- A colour appointment needs a patch test at least 48 hours before, first time only.',
      '- Someone running more than fifteen minutes late loses the slot, because the next person is already waiting.',
      '- Cancellations are free up to 24 hours before. Inside that we keep the deposit.',
      '- We can usually fit a fringe trim in the same week; a full colour needs about ten days.',
      '',
      'What we do not do',
      'Extensions, permanent make-up or anything on under-16s without a parent in the room.',
      '',
      'Worth knowing',
      'The salon is up one flight of stairs with no lift. Parking on the street is metered until 6pm.',
    ].join('\n'),
  },
  {
    id: 'shop',
    name: 'Online shop',
    forWhom: 'Retail and ecommerce — stock, delivery, returns.',
    body: [
      'What we do',
      'We sell our own range online and from one shop. Everything in the catalog is what we actually have.',
      '',
      'How we work',
      '- Orders placed before 2pm on a working day go out the same day.',
      '- Delivery is free over the threshold in the FAQ; below it there is a flat fee.',
      '- Returns within 30 days, unworn and with the tags on. We refund to the original card.',
      '- We do not hold stock on request, but we do tell people when something is back.',
      '',
      'What we do not do',
      'Wholesale, international shipping, or gift wrapping.',
      '',
      'Worth knowing',
      'Sizes run small on the outerwear. If somebody is between sizes, the honest answer is to go up one.',
    ].join('\n'),
  },
  {
    id: 'clinic',
    name: 'Clinic and practice',
    forWhom: 'Dental, medical, veterinary — where the limits matter most.',
    body: [
      'What we do',
      'A private practice. Appointments, check-ups and treatment plans; we are not an emergency service.',
      '',
      'How we work',
      '- New patients fill in a short health form before the first visit.',
      '- Appointments are confirmed the day before; a missed appointment is charged.',
      '- Treatment plans and costs are given in writing after the first consultation, never over chat.',
      '- We can see an urgent case the same day if somebody calls before 11am.',
      '',
      'What we do not do',
      'We never give advice about symptoms, medication or a diagnosis over a message. Anything clinical goes to a person, and an emergency goes to the emergency number.',
      '',
      'Worth knowing',
      'Ground floor, step-free, and there is a waiting room a pram fits into.',
    ].join('\n'),
  },
  {
    id: 'restaurant',
    name: 'Restaurant and cafe',
    forWhom: 'Tables, groups, dietary questions.',
    body: [
      'What we do',
      'A small kitchen with a short menu that changes with the season. Bookings for two to six; larger groups by arrangement.',
      '',
      'How we work',
      '- We hold a table for fifteen minutes.',
      '- Groups of seven or more eat from a set menu, agreed in advance.',
      '- The kitchen closes an hour before the room does.',
      '- We take dietary requirements at booking, not on the night.',
      '',
      'What we do not do',
      'Split bills across more than four cards, takeaway, or changes to a dish once it is on the menu.',
      '',
      'Worth knowing',
      'Almost everything can be made vegetarian; almost nothing can be made gluten-free, because one oven does the bread.',
    ].join('\n'),
  },
  {
    id: 'b2b',
    name: 'Services and B2B',
    forWhom: 'Agencies, studios, consultancies — qualifying an enquiry.',
    body: [
      'What we do',
      'We work with a small number of clients at a time on projects rather than retainers.',
      '',
      'How we work',
      '- A first call is thirty minutes and free; we come back with a written scope within a week.',
      '- We invoice in stages, with the first stage before work starts.',
      '- Our lead time is usually four to six weeks from a signed scope.',
      '- We are happy to be asked about work we have done before; the case studies are on the website.',
      '',
      'What we do not do',
      'Fixed-price work with an open scope, unpaid pitches, or anything we would be the wrong team for. We say so and suggest somebody else.',
      '',
      'Worth knowing',
      'The person asking is often not the person who signs. It is worth finding out early, politely.',
    ].join('\n'),
  },
];

export type InsertMode = 'replace' | 'append';

/** Inserting into an editor that already holds something is a decision, not a click. */
export const needsConfirm = (current: string): boolean => current.trim() !== '';

/**
 * The editor's next value.
 *
 * An empty editor takes the template whatever the mode — there is nothing to
 * append to, and "append" into blank text would leave a leading blank line
 * nobody asked for.
 */
export function applyTemplate(current: string, template: InstructionsTemplate, mode: InsertMode): string {
  if (current.trim() === '' || mode === 'replace') return template.body;
  return `${current.replace(/\s+$/, '')}\n\n${template.body}`;
}

/**
 * Where a finding says this content actually belongs — the target of the
 * "move it" button beside the warning. Null when the fix is here on this page
 * (text that is simply too long) or when there is nowhere to send it.
 */
export function belongsIn(findingId: string): SourceId | null {
  if (findingId === 'instructions.faq') return 'faq';
  if (findingId === 'instructions.prices') return 'products';
  return null;
}
