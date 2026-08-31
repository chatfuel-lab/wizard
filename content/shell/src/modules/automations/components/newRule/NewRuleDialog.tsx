import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Dialog, Input, Label, useToast } from '~ui';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { useAutomationMutations } from '../../hooks/useAutomationMutations';
import { useComposites } from '../../hooks/useComposites';
import { selectCustomsCount } from '../../lib/automationsStore';
import { errorMessage } from '../../lib/errors';
import { defaultRuleName, templateById, templatesFor } from '../../lib/templates';
import type { AutomationRecord } from '../../types';
import { NAME_MAX, nameError } from '../customs/RuleName';
import { RULES_PER_SCOPE, nearestSource, sourceOptions } from '../../lib/newRule';
import { SourcePicker } from './SourcePicker';
import { BLANK_TEMPLATE_ID, TemplateCards } from './TemplateCards';

export interface NewRuleDialogProps {
  open: boolean;
  /** The source to create in (pre-selected; the dialog lets the person change it). */
  scope: FuelyAutomationScope | null;
  onClose: () => void;
  onCreated: (automation: AutomationRecord) => void;
  canEdit: boolean;
}

/**
 * The New-rule dialog: **Source** (the scopes that accept rules, grouped by
 * platform, connection shown, "n / 30 rules"), **Name** (1–200, default "New
 * rule on <source>"), **Start from** (the templates for that source, "Blank"
 * first). Blank → `mutations.create`; a template → `useComposites().fromTemplate`
 * (its progress toast); on success `onCreated(record)` and the workspace lands
 * on the new card. A report that aborted shows its error inline and stays open.
 */
export function NewRuleDialog({ open, scope, onClose, onCreated, canEdit }: NewRuleDialogProps) {
  const catalog = useCatalog();
  const { state } = useAutomationRecords();
  const mutations = useAutomationMutations();
  const composites = useComposites();
  const toast = useToast();

  const customs = useMemo(() => selectCustomsCount(state), [state]);
  const options = useMemo(() => sourceOptions(catalog.channels, customs), [catalog.channels, customs]);

  const [source, setSource] = useState<FuelyAutomationScope | null>(null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [templateId, setTemplateId] = useState(BLANK_TEMPLATE_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset on every open: the source asked for (or the nearest one that takes rules), Blank, a fresh default name.
  useEffect(() => {
    if (!open) return;
    const next = nearestSource(scope, options);
    setSource(next);
    setTemplateId(BLANK_TEMPLATE_ID);
    setNameTouched(false);
    setName(next ? defaultRuleName(next) : '');
    setError(null);
    setBusy(false);
    // Options settle after the catalog loads; re-seeding on that would wipe a typed name — open + scope only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scope]);

  // The source arrives late (store still loading when opened): seed once it can.
  useEffect(() => {
    if (!open || source !== null) return;
    const next = nearestSource(scope, options);
    if (next) {
      setSource(next);
      if (!nameTouched) setName(defaultRuleName(next));
    }
  }, [open, source, scope, options, nameTouched]);

  // A deep link (`?new=`) opens the dialog before the role has loaded: the form
  // (and its input) mounts a beat after the focus trap ran, so focus it then.
  useEffect(() => {
    if (open && canEdit) nameRef.current?.focus();
  }, [open, canEdit]);

  const templates = useMemo(() => (source ? templatesFor(source) : []), [source]);
  const template = templateId === BLANK_TEMPLATE_ID ? null : templateById(templateId);
  const chosen = options.find((o) => o.scope === source) ?? null;
  const full = chosen ? chosen.rules >= RULES_PER_SCOPE : false;

  const changeSource = (next: FuelyAutomationScope) => {
    setSource(next);
    setError(null);
    // A template that does not apply to the new source falls back to Blank.
    if (template && !template.scopes.includes(next)) setTemplateId(BLANK_TEMPLATE_ID);
    if (!nameTouched)
      setName(template && template.scopes.includes(next) ? template.title.slice(0, NAME_MAX) : defaultRuleName(next));
  };

  const changeTemplate = (id: string) => {
    setTemplateId(id);
    setError(null);
    if (nameTouched || !source) return;
    const picked = id === BLANK_TEMPLATE_ID ? null : templateById(id);
    setName(picked ? picked.title.slice(0, NAME_MAX) : defaultRuleName(source));
  };

  const submit = async () => {
    if (!source || busy) return;
    const problem = nameError(name);
    if (problem) {
      setError(problem);
      nameRef.current?.focus();
      return;
    }
    if (full) {
      setError(`This source already has ${RULES_PER_SCOPE} rules — delete one first.`);
      return;
    }
    setBusy(true);
    setError(null);
    const trimmed = name.trim();
    try {
      if (!template) {
        const created = await mutations.create(source, trimmed);
        toast.show({
          title: `Created “${trimmed}”`,
          description: 'It starts turned off — set the triggers, then turn it on.',
          tone: 'success',
          duration: 4000,
        });
        onCreated(created);
        return;
      }
      const report = await composites.fromTemplate({ name: trimmed, scope: source, settings: template.build(source) });
      if (report.aborted || !report.createdId) {
        setError(report.message ?? 'Could not create the rule.');
        return;
      }
      const created = report.results[0]?.automation ?? state.byId[report.createdId];
      if (!created) {
        setError('The rule was created but did not come back — refresh to see it.');
        return;
      }
      onCreated(created);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = canEdit && source !== null && !busy && !full && nameError(name) === null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New rule"
      size="lg"
      initialFocusRef={nameRef}
      footer={
        canEdit ? (
          <>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={busy} disabled={!canSubmit} onClick={() => void submit()}>
              {template ? 'Create from template' : 'Create rule'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {!canEdit ? (
        <Alert tone="info" title="You can view automations but not create rules">
          Creating a rule needs the AI “Edit” permission on this bot. Ask an admin to grant it, or to create the rule
          for you.
        </Alert>
      ) : options.length === 0 && catalog.loading ? (
        <p className="text-sm text-text-muted">Loading sources…</p>
      ) : (
        <form
          className="@container"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        >
          <div className="grid grid-cols-1 gap-5 @min-[36rem]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Source</Label>
                <SourcePicker value={source} onChange={changeSource} options={options} disabled={busy} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-rule-name" hint={`${name.length} / ${NAME_MAX}`}>
                  Name
                </Label>
                <Input
                  id="new-rule-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameTouched(true);
                    setError(null);
                  }}
                  maxLength={NAME_MAX}
                  placeholder={source ? defaultRuleName(source) : 'Name the rule'}
                  aria-invalid={error && nameError(name) ? true : undefined}
                  disabled={busy}
                />
              </div>
              {full ? (
                <Alert tone="warning">
                  This source already has {RULES_PER_SCOPE} rules — the API’s ceiling. Delete one first, or pick another
                  source.
                </Alert>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label
                hint={
                  templates.length === 0
                    ? 'No starter for this source yet — Blank it is.'
                    : 'A starter pre-fills triggers and replies; everything else stays as the source’s Default.'
                }
              >
                Start from
              </Label>
              {source ? (
                <TemplateCards
                  scope={source}
                  templates={templates}
                  value={templateId}
                  onChange={changeTemplate}
                  disabled={busy}
                />
              ) : null}
            </div>
          </div>
          {error ? (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}
        </form>
      )}
    </Dialog>
  );
}
