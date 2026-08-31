import { describe, expect, it } from 'vitest';
import { Weekday } from '~api/generated/knowledge-base/graphql';
import type { KnowledgeBaseInfo } from '../types';
import { INSTRUCTIONS_MAX, lint } from './lint';
import {
  INSTRUCTIONS_TEMPLATES,
  TEMPLATE_SECTIONS,
  applyTemplate,
  belongsIn,
  needsConfirm,
} from './instructionsTemplates';

/** A knowledge base with nothing wrong with it except, possibly, the instructions. */
const kbWith = (additionalInstructions: string): KnowledgeBaseInfo => ({
  companyName: 'Acme Coffee',
  email: 'hello@acme.com',
  phone: '+49 30 901820',
  address: 'Torstrasse 114, Berlin',
  website: 'acme.com',
  howToPay: 'Cards and cash.',
  additionalInstructions,
  businessHoursSchedule: { workingHours: [{ day: Weekday.Mon, enabled: true, start: '09:00', end: '18:00' }] },
  faqs: [],
});

const instructionFindings = (text: string) =>
  lint({ kb: kbWith(text), faqs: [], products: [], services: [], specialists: [], catalogReady: false }).filter(
    (finding) => finding.source === 'instructions',
  );

describe('the template library', () => {
  it('ships between four and six starters', () => {
    expect(INSTRUCTIONS_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(INSTRUCTIONS_TEMPLATES.length).toBeLessThanOrEqual(6);
  });

  it('gives every template a unique id, a name and a line saying who it is for', () => {
    const ids = INSTRUCTIONS_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of INSTRUCTIONS_TEMPLATES) {
      expect(template.name, template.id).toBeTruthy();
      expect(template.forWhom, template.id).toBeTruthy();
    }
  });

  it('answers all four questions a new employee asks', () => {
    for (const template of INSTRUCTIONS_TEMPLATES) {
      for (const section of TEMPLATE_SECTIONS) {
        expect(template.body, `${template.id} is missing ${section}`).toContain(section);
      }
    }
  });

  it('says what a business will NOT do — the half people forget and the assistant then promises', () => {
    for (const template of INSTRUCTIONS_TEMPLATES) {
      const after = template.body.split('What we do not do')[1] ?? '';
      expect(after.trim().length, template.id).toBeGreaterThan(20);
    }
  });

  it('raises no finding of our own — a shipped template must not trip the module lint', () => {
    for (const template of INSTRUCTIONS_TEMPLATES) {
      expect(
        instructionFindings(template.body).map((finding) => finding.id),
        template.id,
      ).toEqual([]);
    }
  });

  it('leaves room for the rest of the knowledge base', () => {
    for (const template of INSTRUCTIONS_TEMPLATES) {
      expect(template.body.length, template.id).toBeLessThan(INSTRUCTIONS_MAX / 2);
    }
  });
});

describe('applyTemplate', () => {
  const template = INSTRUCTIONS_TEMPLATES[0]!;

  it('fills an empty editor whatever the mode', () => {
    expect(applyTemplate('', template, 'append')).toBe(template.body);
    expect(applyTemplate('   \n\n ', template, 'append')).toBe(template.body);
  });

  it('replaces on replace', () => {
    expect(applyTemplate('Be brief.', template, 'replace')).toBe(template.body);
  });

  it('appends after one blank line, without doubling the whitespace already there', () => {
    expect(applyTemplate('Be brief.\n\n\n', template, 'append')).toBe(`Be brief.\n\n${template.body}`);
  });
});

describe('needsConfirm', () => {
  it('only asks when there is something to lose', () => {
    expect(needsConfirm('')).toBe(false);
    expect(needsConfirm('  \n ')).toBe(false);
    expect(needsConfirm('Be brief.')).toBe(true);
  });
});

describe('belongsIn', () => {
  it('sends pasted questions to the FAQ and pasted prices to the catalog', () => {
    expect(belongsIn('instructions.faq')).toBe('faq');
    expect(belongsIn('instructions.prices')).toBe('products');
  });

  it('has nowhere to send a prompt that is merely too long', () => {
    expect(belongsIn('instructions.long')).toBeNull();
    expect(belongsIn('instructions.empty')).toBeNull();
  });
});
