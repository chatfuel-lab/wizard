import { useEffect, useId, useState } from 'react';
import { Alert, Button, Dialog, DurationInput, Input, Select, Switch, Textarea } from '~ui';
import type { GoodsItemPriceCurrency, GoodsServiceInput } from '~api/generated/bookings/graphql';
import { useBookings } from '../../BookingsContext';
import { errorCode, errorMessage } from '../../lib/errors';
import {
  CURRENCY_OPTIONS,
  DESCRIPTION_MAX,
  TITLE_MAX,
  sameServiceDraft,
  serviceDraftOf,
  serviceFieldForCode,
  serviceInputOfDraft,
  validateServiceDraft,
  type ServiceDraft,
  type ServiceErrors,
} from '../../lib/serviceInput';
import type { ServiceRecord } from '../../types';
import { FormField, errorIdOf } from '../staff/FormField';
import { ImagesInput } from './ImagesInput';

export interface ServiceDialogProps {
  open: boolean;
  /** The service being edited, or null for "Add service". */
  service: ServiceRecord | null;
  /** The currency a new service starts in (the bot's country's, when known). */
  defaultCurrency: GoodsItemPriceCurrency;
  onClose: () => void;
  /** Resolve = saved (the dialog closes); reject with the API error → mapped under its field. */
  onSubmit: (input: GoodsServiceInput) => Promise<void>;
}

/**
 * Create or edit one service. Title, description, duration (minutes ↔
 * `durationSeconds`), price (amount + currency; blank = no price),
 * availability, images. Client validation before the round trip
 * (`validateServiceDraft`), the server's code under its field after it
 * (`serviceFieldForCode`). The draft survives a failed save.
 */
export function ServiceDialog({ open, service, defaultCurrency, onClose, onSubmit }: ServiceDialogProps) {
  const { client, botId } = useBookings();
  const id = useId();
  const [draft, setDraft] = useState<ServiceDraft>(() => serviceDraftOf(service, defaultCurrency));
  const [original, setOriginal] = useState<ServiceDraft>(draft);
  const [errors, setErrors] = useState<ServiceErrors>({});
  const [serverErrors, setServerErrors] = useState<ServiceErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-seed on open (a different service, or the same one after an outside edit).
  useEffect(() => {
    if (!open) return;
    const next = serviceDraftOf(service, defaultCurrency);
    setDraft(next);
    setOriginal(next);
    setErrors({});
    setServerErrors({});
    setAttempted(false);
    setSaving(false);
  }, [open, service, defaultCurrency]);

  const edit = (patch: Partial<ServiceDraft>, field: keyof ServiceErrors) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setErrors(validateServiceDraft(next));
    setServerErrors((prev) => {
      const out = { ...prev };
      delete out[field];
      delete out.form;
      return out;
    });
  };

  const shown = (field: keyof ServiceErrors): string | null =>
    serverErrors[field] ?? (attempted ? (errors[field] ?? null) : null);
  const dirty = !sameServiceDraft(draft, original);

  const submit = async () => {
    setAttempted(true);
    const problems = validateServiceDraft(draft);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    setServerErrors({});
    try {
      await onSubmit(serviceInputOfDraft(draft));
      onClose();
    } catch (err) {
      setServerErrors({ [serviceFieldForCode(errorCode(err))]: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const priceId = `${id}-price`;
  const titleError = shown('title');
  const descError = shown('description');
  const priceError = shown('price');
  const durationError = shown('duration');
  const formError = shown('form');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={service ? `Edit ${service.title}` : 'Add service'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving || (service !== null && !dirty)}
            loading={saving}
            onClick={() => void submit()}
          >
            {service ? 'Save' : 'Add service'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <FormField id={titleId} label="Title" required error={titleError}>
          <Input
            id={titleId}
            value={draft.title}
            maxLength={TITLE_MAX + 20}
            autoFocus
            disabled={saving}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? errorIdOf(titleId) : undefined}
            onChange={(e) => edit({ title: e.target.value }, 'title')}
          />
        </FormField>
        <FormField
          id={descId}
          label="Description"
          hint="What the AI tells customers about this service."
          error={descError}
        >
          <Textarea
            id={descId}
            value={draft.description}
            rows={3}
            autoGrow
            maxRows={8}
            maxLength={DESCRIPTION_MAX}
            showCount
            disabled={saving}
            aria-invalid={descError ? true : undefined}
            aria-describedby={descError ? errorIdOf(descId) : undefined}
            onChange={(e) => edit({ description: e.target.value }, 'description')}
          />
        </FormField>
        <FormField id={`${id}-duration`} label="Duration" required error={durationError}>
          <DurationInput
            value={draft.durationMinutes}
            onChange={(minutes) => edit({ durationMinutes: minutes }, 'duration')}
            disabled={saving}
            aria-label="Duration"
            size="sm"
          />
        </FormField>
        <FormField
          id={priceId}
          label="Price"
          hint="Leave blank for no price. Bookings keep the price they were made at."
          error={priceError}
        >
          <div className="flex items-center gap-2">
            <Input
              id={priceId}
              value={draft.priceAmount}
              inputMode="decimal"
              placeholder="0.00"
              disabled={saving}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? errorIdOf(priceId) : undefined}
              onChange={(e) => edit({ priceAmount: e.target.value }, 'price')}
              className="max-w-40"
            />
            <Select
              value={draft.currency}
              options={[...CURRENCY_OPTIONS]}
              disabled={saving}
              aria-label="Currency"
              onChange={(currency) => edit({ currency: currency as GoodsItemPriceCurrency }, 'price')}
            />
          </div>
        </FormField>
        <Switch
          checked={draft.isAvailable}
          onChange={(on) => edit({ isAvailable: on }, 'form')}
          label="Available for booking"
          disabled={saving}
        />
        {client.uploadFile ? (
          <ImagesInput
            botId={botId}
            images={draft.images}
            onChange={(images) => edit({ images }, 'images')}
            uploadFile={client.uploadFile}
            disabled={saving}
            error={shown('images')}
          />
        ) : null}
        {/* Enter in a text field submits; the button in the footer is the visible affordance. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}
