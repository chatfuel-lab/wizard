import { useEffect, useId, useState } from 'react';
import { Alert, Button, Combobox, Dialog, DurationInput, Input, Switch, Textarea } from '~ui';
import type { GoodsItemPriceCurrency, GoodsServiceInput } from '~api/generated/knowledge-base/graphql';
import { useKnowledgeBase } from '../../KnowledgeBaseContext';
import { errorCode, messageFor } from '../../lib/errors';
import { CURRENCY_OPTIONS, DESCRIPTION_MAX, TITLE_MAX } from '../../lib/productInput';
import {
  sameServiceDraft,
  serviceDraftOf,
  serviceFieldForCode,
  serviceInputOfDraft,
  validateServiceDraft,
  type ServiceDraft,
  type ServiceErrors,
} from '../../lib/serviceInput';
import type { CatalogService } from '../../types';
import { FormField, errorIdOf } from '../products/FormField';
import { PhotosInput } from '../products/PhotosInput';

export interface ServiceDialogProps {
  open: boolean;
  service: CatalogService | null;
  defaultCurrency: GoodsItemPriceCurrency;
  onClose: () => void;
  onSubmit: (input: GoodsServiceInput) => Promise<void>;
}

/**
 * Create or edit one service — only reachable when this module owns services
 * (no bookings module in this deployment).
 *
 * The same dialog as a product's, plus a duration, and it shares the photo
 * control and the form row with it: two nearly-identical dialogs in one module
 * that do not share their parts are two dialogs that drift.
 */
export function ServiceDialog({ open, service, defaultCurrency, onClose, onSubmit }: ServiceDialogProps) {
  const { client, botId } = useKnowledgeBase();
  const id = useId();
  const [draft, setDraft] = useState<ServiceDraft>(() => serviceDraftOf(service, defaultCurrency));
  const [original, setOriginal] = useState<ServiceDraft>(draft);
  const [errors, setErrors] = useState<ServiceErrors>({});
  const [serverErrors, setServerErrors] = useState<ServiceErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      setServerErrors({ [serviceFieldForCode(errorCode(err))]: messageFor(err) });
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
  const formError = shown('form');
  const busy = saving || uploading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={service ? `Edit ${service.title}` : 'Add a service'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy || (service !== null && !dirty)}
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
            onChange={(event) => edit({ title: event.target.value }, 'title')}
          />
        </FormField>

        <FormField id={descId} label="Description" error={descError}>
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
            onChange={(event) => edit({ description: event.target.value }, 'description')}
          />
        </FormField>

        <FormField id={`${id}-duration`} label="Duration" required error={shown('duration')}>
          <DurationInput
            value={draft.durationMinutes}
            onChange={(minutes) => edit({ durationMinutes: minutes }, 'duration')}
            disabled={saving}
            aria-label="Duration"
            size="sm"
          />
        </FormField>

        <FormField id={priceId} label="Price" error={priceError}>
          <div className="flex items-center gap-2">
            <Input
              id={priceId}
              value={draft.priceAmount}
              inputMode="decimal"
              placeholder="0.00"
              disabled={saving}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? errorIdOf(priceId) : undefined}
              onChange={(event) => edit({ priceAmount: event.target.value }, 'price')}
              className="max-w-40"
            />
            <Combobox
              value={draft.currency}
              options={[...CURRENCY_OPTIONS]}
              disabled={saving}
              aria-label="Currency"
              className="max-w-40"
              onChange={(currency) =>
                edit({ currency: (currency ?? draft.currency) as GoodsItemPriceCurrency }, 'price')
              }
            />
          </div>
        </FormField>

        <Switch
          checked={draft.isAvailable}
          onChange={(on) => edit({ isAvailable: on }, 'form')}
          label={draft.isAvailable ? 'Available' : 'Unavailable'}
          disabled={saving}
        />

        <PhotosInput
          botId={botId}
          images={draft.images}
          onChange={(images) => edit({ images }, 'images')}
          uploadFile={client.uploadFile}
          disabled={saving}
          error={shown('images')}
          onBusy={setUploading}
        />

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}
