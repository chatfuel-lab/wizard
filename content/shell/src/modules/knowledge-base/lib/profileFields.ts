/**
 * The business profile, as data: which fields exist, what to call them, what
 * good input looks like, and what the assistant does with each one.
 *
 * Every field has its own mutation on the server (`fuelyConfigSetPhone`,
 * `fuelyConfigSetAddress`, ...) - there is no bulk update - so the id here is
 * also the key the store switches on.
 *
 * Validation is ADVISORY. The server accepts any string; a warning tells the
 * person their phone number looks unusable to a customer without refusing to
 * save it, because a business really may have "call the shop bell" in there.
 */

import { safeHref } from '~ui';

export type BusinessField =
  'companyName' | 'phone' | 'email' | 'address' | 'website' | 'howToPay' | 'additionalInstructions';

/** The fields the profile page edits. `additionalInstructions` has its own source. */
export const PROFILE_FIELDS: readonly BusinessField[] = [
  'companyName',
  'phone',
  'email',
  'address',
  'website',
  'howToPay',
];

export interface FieldMeta {
  id: BusinessField;
  label: string;
  /** One line under the input: what the assistant uses it for. */
  hint: string;
  placeholder: string;
  multiline: boolean;
  /** Shown in the readiness checklist when empty. */
  essential: boolean;
  /** Advisory format check. Returns null when the value looks fine. */
  warn?: (value: string) => string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits, spaces, dashes, brackets and one optional leading plus - anything a person would dial. */
const PHONE = /^\+?[\d\s().-]{6,}$/;

export const FIELD_META: Record<BusinessField, FieldMeta> = {
  companyName: {
    id: 'companyName',
    label: 'Company name',
    hint: 'How the assistant introduces you.',
    placeholder: 'Acme Coffee',
    multiline: false,
    essential: true,
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    hint: 'Given out when a customer asks to call.',
    placeholder: '+1 202 555 0142',
    multiline: false,
    essential: true,
    warn: (value) =>
      value.trim() === '' || PHONE.test(value.trim())
        ? null
        : 'This does not look like a number a customer could dial.',
  },
  email: {
    id: 'email',
    label: 'Email',
    hint: 'Given out when a customer asks to write.',
    placeholder: 'hello@acme.com',
    multiline: false,
    essential: false,
    warn: (value) =>
      value.trim() === '' || EMAIL.test(value.trim()) ? null : 'This does not look like an email address.',
  },
  address: {
    id: 'address',
    label: 'Address',
    hint: 'Given out for directions and parking questions.',
    placeholder: '12 Market Street, Berlin',
    multiline: true,
    essential: false,
  },
  website: {
    id: 'website',
    label: 'Website',
    hint: 'Linked when the assistant sends someone to read more.',
    placeholder: 'https://acme.com',
    multiline: false,
    essential: false,
    warn: (value) => {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      /* A person types "acme.com"; that is fine and the assistant will still
         send it. Only flag something that cannot be a host at all. */
      return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)
        ? null
        : 'This does not look like a web address.';
    },
  },
  howToPay: {
    id: 'howToPay',
    label: 'How to pay',
    hint: 'Cards, cash, transfer, deposits - whatever a customer needs to know before booking.',
    placeholder: 'Cards and cash on arrival. A 20% deposit holds a booking.',
    multiline: true,
    essential: false,
  },
  additionalInstructions: {
    id: 'additionalInstructions',
    label: 'AI instructions',
    hint: 'How the assistant behaves: role, task, format. Not a place for facts.',
    placeholder: '',
    multiline: true,
    essential: false,
  },
};

/** Fields a bot should not go live without - what the readiness score counts. */
export const ESSENTIAL_FIELDS: readonly BusinessField[] = PROFILE_FIELDS.filter((field) => FIELD_META[field].essential);

export const warnFor = (field: BusinessField, value: string): string | null => FIELD_META[field].warn?.(value) ?? null;

/**
 * A website a customer can click. The field holds what the person typed, so
 * a bare host gets a scheme here rather than in storage.
 */
export function websiteHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  /* The value is whatever was typed into the field and stored on the server,
     and this function is what turns it into an `href` — so it ends where every
     other link in the app ends, at `safeHref`. The string handed back is the
     one built above rather than `safeHref`'s own output: the field shows the
     address the operator wrote, and a normalising round-trip would quietly
     rewrite it. */
  return safeHref(candidate) === null ? null : candidate;
}
