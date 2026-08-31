import { useEffect, useId, useState } from 'react';
import { Alert, Button, Checkbox, Dialog, Input, Tag, Textarea, formatDuration } from '~ui';
import type { SpecialistInfoInput } from '~api/generated/knowledge-base/graphql';
import { useKnowledgeBase } from '../../KnowledgeBaseContext';
import { errorCode, messageFor } from '../../lib/errors';
import { formatPrice } from '../../lib/productInput';
import {
  ABOUT_MAX,
  FIRST_NAME_MAX,
  LAST_NAME_MAX,
  draftName,
  sameSpecialistDraft,
  specialistDraftOf,
  specialistFieldForCode,
  specialistInfoInputOf,
  toggleService,
  validateSpecialistDraft,
  type SpecialistDraft,
  type SpecialistErrors,
} from '../../lib/specialistInput';
import type { CatalogService, SpecialistInfo } from '../../types';
import { FormField, errorIdOf } from '../products/FormField';
import { AvatarInput } from './AvatarInput';

export interface SpecialistDialogProps {
  open: boolean;
  specialist: SpecialistInfo | null;
  /** Every service on the bot — what the checkboxes offer. */
  services: readonly CatalogService[];
  onClose: () => void;
  onSubmit: (info: SpecialistInfoInput) => Promise<void>;
}

/**
 * Create or edit one specialist — only reachable when this module owns the
 * team (no bookings module in this deployment).
 *
 * Deliberately NOT a working-hours editor. Hours are a scheduling concern, the
 * knowledge base never reads them, and half an hours editor is worse than
 * none: the schedule the API already holds is re-sent untouched
 * (`specialistInfoInputOf`), which is the only reason editing a name here does
 * not clear somebody's week.
 */
export function SpecialistDialog({ open, specialist, services, onClose, onSubmit }: SpecialistDialogProps) {
  const { client, botId } = useKnowledgeBase();
  const id = useId();
  const [draft, setDraft] = useState<SpecialistDraft>(() => specialistDraftOf(specialist));
  const [original, setOriginal] = useState<SpecialistDraft>(draft);
  const [errors, setErrors] = useState<SpecialistErrors>({});
  const [serverErrors, setServerErrors] = useState<SpecialistErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = specialistDraftOf(specialist);
    setDraft(next);
    setOriginal(next);
    setErrors({});
    setServerErrors({});
    setAttempted(false);
    setSaving(false);
  }, [open, specialist]);

  const edit = (patch: Partial<SpecialistDraft>, field: keyof SpecialistErrors) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setErrors(validateSpecialistDraft(next));
    setServerErrors((prev) => {
      const out = { ...prev };
      delete out[field];
      delete out.form;
      return out;
    });
  };

  const shown = (field: keyof SpecialistErrors): string | null =>
    serverErrors[field] ?? (attempted ? (errors[field] ?? null) : null);
  const dirty = !sameSpecialistDraft(draft, original);

  const submit = async () => {
    setAttempted(true);
    const problems = validateSpecialistDraft(draft);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    setServerErrors({});
    try {
      await onSubmit(specialistInfoInputOf(draft, specialist));
      onClose();
    } catch (err) {
      setServerErrors({ [specialistFieldForCode(errorCode(err))]: messageFor(err) });
    } finally {
      setSaving(false);
    }
  };

  const firstId = `${id}-first`;
  const lastId = `${id}-last`;
  const aboutId = `${id}-about`;
  const firstError = shown('firstName');
  const lastError = shown('lastName');
  const aboutError = shown('aboutInfo');
  const formError = shown('form');
  const chosen = new Set(draft.serviceIds);
  const busy = saving || uploading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={specialist ? `Edit ${draftName(draft)}` : 'Add a specialist'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy || (specialist !== null && !dirty)}
            loading={saving}
            onClick={() => void submit()}
          >
            {specialist ? 'Save' : 'Add specialist'}
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

        <AvatarInput
          botId={botId}
          value={draft.logo}
          onChange={(logo) => edit({ logo }, 'logo')}
          name={draftName(draft)}
          uploadFile={client.uploadFile}
          disabled={saving}
          error={shown('logo')}
          onBusy={setUploading}
        />

        <div className="grid grid-cols-1 gap-3 @compact:grid-cols-2">
          <FormField id={firstId} label="First name" required error={firstError}>
            <Input
              id={firstId}
              value={draft.firstName}
              maxLength={FIRST_NAME_MAX + 20}
              autoComplete="off"
              autoFocus
              disabled={saving}
              aria-invalid={firstError ? true : undefined}
              aria-describedby={firstError ? errorIdOf(firstId) : undefined}
              onChange={(event) => edit({ firstName: event.target.value }, 'firstName')}
            />
          </FormField>
          <FormField id={lastId} label="Last name" error={lastError}>
            <Input
              id={lastId}
              value={draft.lastName}
              maxLength={LAST_NAME_MAX + 20}
              autoComplete="off"
              disabled={saving}
              aria-invalid={lastError ? true : undefined}
              aria-describedby={lastError ? errorIdOf(lastId) : undefined}
              onChange={(event) => edit({ lastName: event.target.value }, 'lastName')}
            />
          </FormField>
        </div>

        <FormField id={aboutId} label="About" error={aboutError}>
          <Textarea
            id={aboutId}
            value={draft.aboutInfo}
            rows={3}
            autoGrow
            maxRows={8}
            maxLength={ABOUT_MAX}
            showCount
            disabled={saving}
            aria-invalid={aboutError ? true : undefined}
            aria-describedby={aboutError ? errorIdOf(aboutId) : undefined}
            onChange={(event) => edit({ aboutInfo: event.target.value }, 'aboutInfo')}
          />
        </FormField>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-text-muted">Services</legend>
          {services.length === 0 ? (
            <p className="text-sm text-text-muted">
              No services on this bot yet. Add one on the Services source, then come back and tick it here.
            </p>
          ) : (
            <ul role="list" className="flex flex-col gap-2">
              {services.map((service) => (
                <li key={service.id} className="flex items-center justify-between gap-3">
                  <Checkbox
                    checked={chosen.has(service.id)}
                    disabled={saving}
                    onChange={(on) => edit({ serviceIds: toggleService(draft.serviceIds, service.id, on) }, 'services')}
                    label={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{service.title}</span>
                        <span className="text-xs text-text-muted">
                          {formatDuration(Math.round(service.durationSeconds / 60))} · {formatPrice(service.price)}
                        </span>
                      </span>
                    }
                  />
                  {!service.isAvailable ? <Tag tone="warning">Unavailable</Tag> : null}
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}
