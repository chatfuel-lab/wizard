import { useCallback, useEffect, useMemo, useRef, type Dispatch } from 'react';
import {
  Avatar,
  Button,
  Combobox,
  IconClose,
  IconUser,
  Input,
  Label,
  Select,
  SegmentedControl,
  Spinner,
  Switch,
  Tag,
  Textarea,
  type ComboboxOption,
} from '~ui';
import { BookingInlineContactSearchDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../../BookingsContext';
import { useContactSearch } from '../../hooks/useContactSearch';
import { countryOptions } from '../../lib/countries';
import {
  canAdoptKnownName,
  existingFromHit,
  isBookableHit,
  normalizePhone,
  relevantLookup,
  type CustomerMode,
  type WizardAction,
  type WizardState,
} from '../../lib/wizardStore';

export type CustomerPickerState = Pick<
  WizardState,
  'customerMode' | 'existing' | 'draft' | 'lookup' | 'customerSkipped'
>;

export interface CustomerPickerProps {
  state: CustomerPickerState;
  dispatch: Dispatch<WizardAction>;
  /** Offer "Continue without a customer" (the wizard does; the panel's attach flow does not). */
  skippable?: boolean;
  disabled?: boolean;
  /** Focus the first control on mount. */
  autoFocus?: boolean;
}

const MODE_OPTIONS: readonly { value: CustomerMode; label: string }[] = [
  { value: 'existing', label: 'Existing contact' },
  { value: 'new', label: 'New customer' },
];

const NOT_BOOKABLE = 'Only WhatsApp contacts can be booked';

/**
 * Who the booking is for — the wizard's Customer step, and the panel's
 * "Attach a customer" flow, one component. State and rules live in
 * `lib/wizardStore.ts` (both drafts survive flipping the mode); this holds
 * the controls, the contact search and the phone-blur inline lookup.
 *
 * Existing = a server-search combobox (`BookingContactsSearch`; name or
 * phone). Only WhatsApp contacts can be booked, so other typenames are
 * disabled — the design system's `Combobox` shows them greyed with the reason
 * as their description, so the operator sees where Olivia went and why she
 * cannot be picked.
 *
 * New = name, phone, country, note. On phone blur `BookingInlineContactSearch`
 * asks whether the number is already known; a known name fills an empty name
 * and is offered over a typed one (any error = not known — the live API
 * answers a wrapped `BookingInlineContactDoesNotExist`). "Also create a
 * WhatsApp contact" makes the booking's customer a real contact
 * (`BookingWhatsappContactCreate` first, then `contactID`) — the caller does
 * that at create time.
 */
export function CustomerPicker({
  state,
  dispatch,
  skippable = false,
  disabled = false,
  autoFocus = false,
}: CustomerPickerProps) {
  const { client, botId } = useBookings();
  const search = useContactSearch(state.customerMode === 'existing' && !disabled);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus();
  }, [autoFocus, state.customerMode]);

  const options = useMemo<ComboboxOption[]>(() => {
    const out: ComboboxOption[] = search.hits.map((hit) => {
      const bookable = isBookableHit(hit);
      const phone = hit.__typename === 'WhatsappContact' ? hit.phone : null;
      return {
        value: hit.id,
        label: hit.name || 'Unnamed',
        description: bookable ? (phone ? `+${phone.replace(/^\+/, '')}` : undefined) : NOT_BOOKABLE,
        keywords: phone ? [phone] : undefined,
        icon: <Avatar src={hit.profilePictureUrl ?? undefined} name={hit.name || '?'} size={20} />,
        disabled: !bookable,
      };
    });
    // The picked contact stays selectable (and visible) even when the current search no longer lists it.
    if (state.existing && !out.some((o) => o.value === state.existing!.contactId)) {
      out.unshift({
        value: state.existing.contactId,
        label: state.existing.name ?? 'Selected contact',
        description: state.existing.phone
          ? `+${state.existing.phone.replace(/^\+/, '')}`
          : state.existing.name
            ? undefined
            : state.existing.contactId,
        icon: <IconUser size={16} />,
      });
    }
    return out;
  }, [search.hits, state.existing]);

  const pick = useCallback(
    (id: string | null) => {
      if (id === null) {
        dispatch({ type: 'existingPicked', contact: null });
        return;
      }
      const hit = search.hits.find((h) => h.id === id);
      const contact = hit ? existingFromHit(hit) : state.existing?.contactId === id ? state.existing : null;
      if (contact) dispatch({ type: 'existingPicked', contact });
    },
    [dispatch, search.hits, state.existing],
  );

  // Phone blur → is this number already a customer of the bot?
  const lookup = relevantLookup(state);
  const lookupPhone = useCallback(async () => {
    const phone = normalizePhone(state.draft.phone);
    if (!phone || (lookup && lookup.phone === phone)) return;
    dispatch({ type: 'lookupStarted', phone });
    try {
      const data = await client.query(BookingInlineContactSearchDocument, { botID: botId, phoneNumber: phone });
      const known = data.bot.inlineContact;
      if (known)
        dispatch({ type: 'lookupFound', phone, known: { id: known.id, name: known.name, note: known.note ?? null } });
      else dispatch({ type: 'lookupMissed', phone });
    } catch {
      dispatch({ type: 'lookupMissed', phone });
    }
  }, [state.draft.phone, lookup, dispatch, client, botId]);

  const countries = useMemo(() => countryOptions(), []);

  if (state.customerSkipped) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-border px-3 py-2">
        <span className="text-sm text-text-muted">No customer — the booking will show as “Walk-in”.</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => dispatch({ type: 'customerSkipped', skipped: false })}
        >
          Add a customer
        </Button>
      </div>
    );
  }

  return (
    <div className="@container space-y-3">
      <SegmentedControl
        aria-label="Customer"
        size="sm"
        value={state.customerMode}
        onChange={(mode) => dispatch({ type: 'customerModeSet', mode })}
        options={MODE_OPTIONS}
      />

      {state.customerMode === 'existing' ? (
        <div className="space-y-2">
          <Combobox
            aria-label="Search contacts"
            value={state.existing?.contactId ?? null}
            onChange={pick}
            options={options}
            onSearch={search.setQuery}
            loading={search.loading && search.hits.length === 0}
            placeholder="Search by name or phone…"
            clearable
            disabled={disabled}
            empty={search.error ?? (search.query.trim() === '' ? 'No contacts yet' : 'No contacts match')}
          />
          {state.existing ? (
            <div className="flex items-center gap-2 rounded-card border border-border bg-surface-sunken px-2.5 py-2">
              <Avatar name={state.existing.name ?? '?'} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">
                  {state.existing.name ?? 'Selected contact'}
                </div>
                <div className="truncate text-xs text-text-muted">
                  {state.existing.phone ? `+${state.existing.phone.replace(/^\+/, '')}` : state.existing.contactId}
                </div>
              </div>
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                aria-label="Clear the customer"
                disabled={disabled}
                onClick={() => pick(null)}
              >
                <IconClose />
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 @compact:grid-cols-2">
            <div>
              <Label htmlFor="bk-new-name" required>
                Name
              </Label>
              <Input
                id="bk-new-name"
                ref={firstRef}
                value={state.draft.name}
                disabled={disabled}
                autoComplete="off"
                onChange={(e) => dispatch({ type: 'draftChanged', patch: { name: e.target.value } })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label htmlFor="bk-new-phone" required>
                Phone
              </Label>
              <div className="relative">
                <Input
                  id="bk-new-phone"
                  value={state.draft.phone}
                  disabled={disabled}
                  inputMode="tel"
                  autoComplete="off"
                  onChange={(e) => dispatch({ type: 'draftChanged', patch: { phone: e.target.value } })}
                  onBlur={() => void lookupPhone()}
                  placeholder="+1 202 555 0102"
                  aria-describedby="bk-new-phone-hint"
                />
                {lookup?.status === 'looking' ? (
                  <span className="absolute inset-y-0 right-2 flex items-center">
                    <Spinner size={14} />
                  </span>
                ) : null}
              </div>
              <p id="bk-new-phone-hint" className="mt-1 text-xs text-text-faint">
                With the country code, or pick the country below.
              </p>
            </div>
          </div>

          {lookup?.status === 'found' && lookup.known ? (
            <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface-sunken px-2.5 py-1.5 text-xs">
              <Tag tone="accent">Known customer</Tag>
              <span className="text-text-muted">
                This number is on file as <span className="font-medium text-text">{lookup.known.name}</span>
                {lookup.known.note ? ` — “${lookup.known.note}”` : ''}.
              </span>
              {canAdoptKnownName(state) ? (
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'knownNameAdopted' })}
                >
                  Use this name
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 @compact:grid-cols-2">
            <div>
              <Label hint="Read against a number typed without +.">Country</Label>
              <Select
                aria-label="Country"
                value={state.draft.countryCode}
                disabled={disabled}
                onChange={(value) => dispatch({ type: 'draftChanged', patch: { countryCode: value } })}
                options={countries}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="bk-new-note">Note</Label>
              <Textarea
                id="bk-new-note"
                rows={2}
                value={state.draft.note}
                disabled={disabled}
                onChange={(e) => dispatch({ type: 'draftChanged', patch: { note: e.target.value } })}
                placeholder="Anything the specialist should know"
              />
            </div>
          </div>

          <Switch
            checked={state.draft.createContact}
            disabled={disabled}
            onChange={(next) => dispatch({ type: 'draftChanged', patch: { createContact: next } })}
            label="Also create a WhatsApp contact"
          />
        </div>
      )}

      {skippable ? (
        <div className="pt-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => dispatch({ type: 'customerSkipped', skipped: true })}
          >
            Continue without a customer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
