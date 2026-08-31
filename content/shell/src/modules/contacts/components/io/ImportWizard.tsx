import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconDownload,
  IconFile,
  Select,
  Separator,
  Spinner,
  Stepper,
  Tag,
  safeHref,
  type ComboboxOption,
} from '~ui';
import { Platform } from '~api/generated/contacts/graphql';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import { useContactImport } from '../../hooks/useContactImport';
import { PLATFORM_LABELS } from '../../lib/platforms';
import { ago } from '../../lib/time';
import {
  SAMPLE_CSV,
  SAMPLE_CSV_NAME,
  WIZARD_STEPS,
  importOutcome,
  importedContactsCaveat,
  mappedCount,
  mappingIssues,
  progressLabel,
} from '../../lib/importPlan';
import { ImportColumns } from './ImportColumns';

/**
 * The CSV import, as the four steps the API actually has.
 *
 * File → Columns → Import → Result is not a UX convention here; it is the call
 * sequence (`upload` → `create` → `updateColumns` → `start` → the subscription),
 * and every step exists because there is a server round trip that cannot be
 * folded into its neighbour. The `Stepper` shows which one is live so a person
 * who reloads mid-import lands somewhere they recognise.
 *
 * Two things this screen deliberately refuses to do:
 *
 * - **No progress bar while it runs.** The import publishes counters and never
 *   a total, so a bar would be a number nobody sent. It counts instead.
 * - **No "0 created, 0 updated, 0 rejected" as a result.** An import that
 *   changed nothing says so in words; three zeros read like a bug.
 */

export interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  catalog: AttributeCatalog;
  onImported: () => void;
}

/** Import creates contacts, and only WhatsApp can create one from a phone. */
const IMPORT_PLATFORMS: readonly Platform[] = [Platform.Whatsapp, Platform.Instagram, Platform.Facebook];

export function ImportWizard({ open, onClose, catalog, onImported }: ImportWizardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const importer = useContactImport();
  const [confirmReplace, setConfirmReplace] = useState(false);
  /* One notification per import, not one per subscription frame. */
  const announcedRef = useRef<string | null>(null);

  const { imported, drafts, platform, step } = importer;
  /* The rejected-rows file is an address the server hands back, so it goes
     through `safeHref` before it becomes a link. `errorsFileNote` below still
     says the file exists, so a refused address is not silence. */
  const errorsHref = importer.errorsFileUrl ? safeHref(importer.errorsFileUrl) : null;
  const issues = useMemo(
    () => mappingIssues(imported, drafts, platform, catalog.phoneNames),
    [imported, drafts, platform, catalog.phoneNames],
  );
  const fileIssues = issues.filter((issue) => issue.columnIndex === null);
  const outcome = imported ? importOutcome(imported) : null;

  const options = useMemo<ComboboxOption[]>(
    () =>
      catalog.entries.map((entry) => ({
        value: entry.name,
        label: entry.name,
        description: entry.type === 'system' ? 'system field' : undefined,
      })),
    [catalog.entries],
  );

  useEffect(() => {
    if (step !== 'done' || !imported) return;
    if (announcedRef.current === imported.id) return;
    announcedRef.current = imported.id;
    /* Only a run that landed something is worth a refetch — a finished import
       adopted from last week must not shake the list every time the dialog
       opens. */
    if (importer.restored) return;
    if (importOutcome(imported).imported > 0) onImported();
  }, [step, imported, importer.restored, onImported]);

  const sampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`;

  const footer = (
    <>
      {step === 'map' ? (
        <Button variant="ghost" onClick={importer.reset} disabled={importer.busy}>
          Start over
        </Button>
      ) : null}
      {step === 'done' ? (
        <Button variant="secondary" onClick={importer.reset}>
          Import another file
        </Button>
      ) : null}
      {step === 'map' ? (
        <Button
          onClick={() => void importer.start()}
          disabled={importer.busy || issues.length > 0 || mappedCount(drafts) === 0}
        >
          {importer.busy ? <Spinner size={14} /> : null}
          Import {mappedCount(drafts)} column{mappedCount(drafts) === 1 ? '' : 's'}
        </Button>
      ) : (
        <Button onClick={onClose}>Close</Button>
      )}
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Import contacts from CSV" size="lg" footer={footer}>
      <Stepper
        aria-label="Import progress"
        className="mb-4"
        steps={WIZARD_STEPS.map((entry) => ({
          id: entry.id,
          label: entry.label,
          status: entry.id === 'map' && fileIssues.length > 0 && step === 'map' ? 'error' : undefined,
        }))}
        current={step}
      />

      {importer.error ? (
        <Alert tone="danger" title="The import ran into a problem" className="mb-3">
          {importer.error}
        </Alert>
      ) : null}

      {!importer.supported ? (
        <Alert tone="warning" title="No upload path on this host">
          A CSV import starts with a REST upload, and this app was mounted without an upload function. Wire{' '}
          <code>uploadFile</code> into the client — the dev proxy already forwards it — and the wizard works.
        </Alert>
      ) : null}

      {step === 'file' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-body font-medium text-text">Channel</span>
            <Select
              aria-label="Channel to import into"
              value={platform}
              onChange={(value) => importer.setPlatform(value as Platform)}
              options={IMPORT_PLATFORMS.map((entry) => ({
                value: entry,
                label: PLATFORM_LABELS[entry],
              }))}
              className="w-56"
            />
            <p className="text-meta text-text-muted">
              WhatsApp is the channel that can create a contact from a phone number. On the others a contact only exists
              once the person has written in, and the import is usually refused outright.
            </p>
            {platform === Platform.Whatsapp && importer.whatsappConnected === false ? (
              <Alert tone="warning" title="No WhatsApp number is connected">
                Imported contacts need a connected WhatsApp phone number to belong to. Connect one in Chatfuel first, or
                the import will stop as soon as it starts.
              </Alert>
            ) : null}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-body font-medium text-text">The file</span>
            <p className="text-meta text-text-muted">
              A comma-separated UTF-8 file with one contact per row and a header row on top. A phone column is required
              for WhatsApp; everything else becomes a contact attribute, and a column can be skipped.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={!importer.supported || importer.uploading}
                onClick={() => fileRef.current?.click()}
              >
                {importer.uploading ? <Spinner size={14} /> : <IconFile size={16} />}
                {importer.uploading ? 'Uploading…' : 'Choose a CSV'}
              </Button>
              <a
                href={sampleHref}
                download={SAMPLE_CSV_NAME}
                className="inline-flex h-field items-center gap-1.5 rounded-control border border-border px-3 text-body text-text transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:focus-ring"
              >
                <IconDownload size={16} />
                Download a sample
              </a>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Choose a CSV file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importer.pickFile(file);
              }}
            />
          </div>
        </div>
      ) : null}

      {step === 'map' ? (
        <div className="flex flex-col gap-3">
          {importer.restored ? (
            <Alert tone="info" title="An unfinished import was waiting">
              This file was uploaded earlier and never started. Check the mapping and run it, or start over with a
              different file.
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-meta text-text-muted">
              {importer.fileName ? `${importer.fileName} · ` : ''}
              {drafts.length} column{drafts.length === 1 ? '' : 's'} · {mappedCount(drafts)} mapped
            </span>
            {confirmReplace ? (
              <span className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={importer.uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {importer.uploading ? <Spinner size={12} /> : null}
                  Pick the file
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReplace(false)}>
                  Keep this one
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmReplace(true)}>
                Wrong file?
              </Button>
            )}
          </div>

          {fileIssues.map((issue) => (
            <Alert key={issue.text} tone="danger" title="This file cannot be imported yet">
              {issue.text}
            </Alert>
          ))}

          <ImportColumns
            drafts={drafts}
            options={options}
            issues={issues}
            onChange={importer.setColumn}
            disabled={importer.busy}
          />

          <p className="text-meta text-text-muted">
            A row whose phone already exists updates that contact instead of creating a second one. Writing a field that
            no contact has yet is what creates it — the import is a perfectly ordinary way to add a new attribute to a
            bot.
          </p>
        </div>
      ) : null}

      {step === 'run' && imported ? (
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-body text-text">
            <Spinner size={16} />
            Importing…
          </span>
          <span className="text-body tabular-nums text-text">{progressLabel(imported)}</span>
          <p className="text-meta text-text-muted">
            The API reports counters but never a row total, so there is no percentage to show. You can close this dialog
            — the import keeps running, and reopening it picks the counters back up.
          </p>
        </div>
      ) : null}

      {step === 'done' && imported && outcome ? (
        <div className="flex flex-col gap-3">
          {importer.restored ? (
            <span className="flex items-center gap-2 text-meta text-text-muted">
              <Tag tone="neutral">last import</Tag>
              finished {ago(imported.finishedAt)}
            </span>
          ) : null}

          <Alert
            tone={outcome.declined > 0 ? 'warning' : 'success'}
            title={outcome.declined > 0 ? 'Imported, with rejected rows' : 'Import finished'}
          >
            {outcome.headline}
          </Alert>

          {outcome.declinedReasons.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-body font-medium text-text">Why rows were rejected</span>
              {outcome.declinedReasons.map((reason) => (
                <span key={reason.id} className="text-meta text-text-muted">
                  {reason.count.toLocaleString()} × {reason.description}
                </span>
              ))}
            </div>
          ) : null}

          {outcome.partial.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-body font-medium text-text">Contacts imported with gaps</span>
              <span className="text-meta text-text-muted">
                These contacts landed, but some of their fields did not.
              </span>
              {outcome.partial.map((reason) => (
                <span key={reason.id} className="text-meta text-text-muted">
                  {reason.count.toLocaleString()} × {reason.description}
                </span>
              ))}
            </div>
          ) : null}

          {errorsHref ? (
            <a
              href={errorsHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-field w-fit items-center gap-1.5 rounded-control border border-border px-3 text-body text-text transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:focus-ring"
            >
              <IconDownload size={16} />
              Download the rejected rows
            </a>
          ) : null}
          {importer.errorsFileNote ? (
            <span className="text-meta text-text-muted">{importer.errorsFileNote}</span>
          ) : null}

          {importedContactsCaveat(outcome) ? (
            <p className="text-meta text-text-muted">{importedContactsCaveat(outcome)}</p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
