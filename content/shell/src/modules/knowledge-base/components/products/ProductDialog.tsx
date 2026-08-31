import { useEffect, useId, useState } from 'react';
import { Alert, Button, Combobox, Dialog, Input, Switch, Textarea } from '~ui';
import type { GoodsItemPriceCurrency, GoodsProductInput } from '~api/generated/knowledge-base/graphql';
import { useKnowledgeBase } from '../../KnowledgeBaseContext';
import { errorCode, messageFor } from '../../lib/errors';
import {
  CURRENCY_OPTIONS,
  DESCRIPTION_MAX,
  TITLE_MAX,
  productDraftOf,
  productFieldForCode,
  productInputOfDraft,
  sameProductDraft,
  validateProductDraft,
  type ProductDraft,
  type ProductErrors,
} from '../../lib/productInput';
import type { CatalogProduct } from '../../types';
import { FormField, errorIdOf } from './FormField';
import { PhotosInput } from './PhotosInput';

export interface ProductDialogProps {
  open: boolean;
  /** The product being edited, or null for "Add a product". */
  product: CatalogProduct | null;
  /** The currency a new product starts in — what the rest of the catalog uses. */
  defaultCurrency: GoodsItemPriceCurrency;
  onClose: () => void;
  /** Resolve = saved (the dialog closes); reject with the API error → mapped under its field. */
  onSubmit: (input: GoodsProductInput) => Promise<void>;
}

/**
 * Create or edit one product: title, description, price (amount + currency;
 * blank means no price), availability, photos.
 *
 * Client validation before the round trip (`validateProductDraft`), the
 * server's error code under its own field after it (`productFieldForCode`),
 * and the draft SURVIVES a failed save — a rejected write that also throws
 * away the typing is two losses for one mistake.
 */
export function ProductDialog({ open, product, defaultCurrency, onClose, onSubmit }: ProductDialogProps) {
  const { client, botId } = useKnowledgeBase();
  const id = useId();
  const [draft, setDraft] = useState<ProductDraft>(() => productDraftOf(product, defaultCurrency));
  const [original, setOriginal] = useState<ProductDraft>(draft);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [serverErrors, setServerErrors] = useState<ProductErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* Re-seed on open: a different product, or the same one after an edit elsewhere. */
  useEffect(() => {
    if (!open) return;
    const next = productDraftOf(product, defaultCurrency);
    setDraft(next);
    setOriginal(next);
    setErrors({});
    setServerErrors({});
    setAttempted(false);
    setSaving(false);
  }, [open, product, defaultCurrency]);

  const edit = (patch: Partial<ProductDraft>, field: keyof ProductErrors) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setErrors(validateProductDraft(next));
    /* The server's verdict was about the value that has just changed. */
    setServerErrors((prev) => {
      const out = { ...prev };
      delete out[field];
      delete out.form;
      return out;
    });
  };

  /* Client errors only after a submit attempt: telling somebody the title is
     required while they are still typing the first letter is noise. */
  const shown = (field: keyof ProductErrors): string | null =>
    serverErrors[field] ?? (attempted ? (errors[field] ?? null) : null);
  const dirty = !sameProductDraft(draft, original);

  const submit = async () => {
    setAttempted(true);
    const problems = validateProductDraft(draft);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    setServerErrors({});
    try {
      await onSubmit(productInputOfDraft(draft));
      onClose();
    } catch (err) {
      setServerErrors({ [productFieldForCode(errorCode(err))]: messageFor(err) });
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
      title={product ? `Edit ${product.title}` : 'Add a product'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy || (product !== null && !dirty)}
            loading={saving}
            onClick={() => void submit()}
          >
            {product ? 'Save' : 'Add product'}
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

        {/* Enter in a text field submits; the footer button is the visible affordance. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}
