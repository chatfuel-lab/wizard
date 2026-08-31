import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatfuelGraphQLError } from '~api';
import {
  BotContactScopesDocument,
  CsvImportCreateDocument,
  CsvImportErrorsFileDocument,
  CsvImportStartDocument,
  CsvImportUpdateColumnsDocument,
  CsvImportUpdateFileDocument,
  CsvImportUpdatedDocument,
  DashboardLocale,
  LatestCsvImportDocument,
  Platform,
  type CsvImportInfoFragment,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import {
  columnsFingerprint,
  columnsRequest,
  draftsFrom,
  errorsFileSentence,
  importErrorSentence,
  isFinished,
  isRunning,
  setColumnAttribute,
  stepFor,
  type ColumnDraft,
  type ImportStep,
} from '../lib/importPlan';

/**
 * The CSV import, as one state machine over the five calls the API needs.
 *
 * ```
 * REST upload → csvContactImportCreate → csvContactImportUpdateColumns
 *             → csvContactImportStart  → csvContactImportUpdated (subscription)
 * ```
 *
 * Four decisions in here are the API's, not the UI's:
 *
 * 1. **The upload is REST and nothing else.** GraphQL never takes bytes, so
 *    `client.uploadFile` (fileType `Document`) is step zero and the whole
 *    wizard is unavailable on a host that did not attach one — better a
 *    sentence saying so than a file picker whose Continue never lights up.
 * 2. **A wrong file is swapped, not restarted.** `csvContactImportUpdateFile`
 *    exists precisely for "that was the wrong CSV", and it keeps the import id
 *    — so re-picking is one call, not a new import the server has to expire.
 * 3. **`latestCSVContactsImport(platform)` is per platform**, and it returns
 *    the last import whether it is running or long finished. An unfinished one
 *    is a wizard to resume; a finished one is history, and the UI labels it as
 *    history rather than as "your import just completed".
 * 4. **`errorsFile` is asked for on its own, after the fact.** It errors while
 *    the import is unfinished and when there is nothing to report, so it is
 *    outside the main fragment and its two ordinary failures are silent.
 */

export interface ContactImportState {
  /** Absent `uploadFile` on the client — there is no import path at all. */
  supported: boolean;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  /** Null until a WhatsApp scope check has answered. */
  whatsappConnected: boolean | null;
  step: ImportStep;
  imported: CsvImportInfoFragment | null;
  /** True when `imported` was adopted on open rather than created here. */
  restored: boolean;
  drafts: ColumnDraft[];
  setColumn: (index: number, attributeName: string | null) => void;
  fileName: string | null;
  uploading: boolean;
  busy: boolean;
  error: string | null;
  /** The rejected-rows CSV, once the import has finished and produced one. */
  errorsFileUrl: string | null;
  errorsFileNote: string | null;
  pickFile: (file: File) => Promise<void>;
  start: () => Promise<void>;
  /** Throw the current import away and go back to the file step. */
  reset: () => void;
}

const codeOf = (err: unknown): string | null => (err instanceof ChatfuelGraphQLError ? (err.code ?? null) : null);

const messageOf = (err: unknown): string =>
  importErrorSentence(codeOf(err), err instanceof Error ? err.message : String(err));

export function useContactImport(): ContactImportState {
  const { client, botId } = useContacts();
  const [platform, setPlatformState] = useState<Platform>(Platform.Whatsapp);
  const [imported, setImported] = useState<CsvImportInfoFragment | null>(null);
  const [restored, setRestored] = useState(false);
  const [drafts, setDrafts] = useState<ColumnDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [errorsFileUrl, setErrorsFileUrl] = useState<string | null>(null);
  const [errorsFileNote, setErrorsFileNote] = useState<string | null>(null);
  /* Set once the user has thrown an import away: the restore query must not
     hand the same one straight back. */
  const dismissedRef = useRef<string | null>(null);

  const supported = typeof client.uploadFile === 'function';

  /* The mapping is a draft over the backend's guess, re-derived when the
     import's *columns* change and at no other time.
     `imported` is a fresh object on every subscription frame, so an effect
     that depended on it would throw away whatever the user had just picked
     the next time a counter ticked. Hence the fingerprint — which includes the
     previews, because a swapped file keeps the import id and can keep every
     index and guess (`columnsFingerprint`) — and the ref that keeps the
     effect's dependency list honest without widening it. */
  const importedRef = useRef<CsvImportInfoFragment | null>(null);
  importedRef.current = imported;
  const columnsKey = useMemo(() => columnsFingerprint(imported), [imported]);
  useEffect(() => {
    const current = importedRef.current;
    setDrafts(current ? draftsFrom(current) : []);
  }, [columnsKey]);

  // Is there anywhere for imported WhatsApp contacts to live?
  useEffect(() => {
    let cancelled = false;
    client
      .query(BotContactScopesDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const scopes = data.bot?.contactScopes ?? [];
        setWhatsappConnected(scopes.some((scope) => scope.__typename === 'WhatsAppPhoneContactScope'));
      })
      .catch(() => {
        /* Unknown is a legitimate answer: the check only ever *adds* a warning,
           and a failed probe must not block an import that would have worked. */
        if (!cancelled) setWhatsappConnected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  // Resume: the latest import on this platform, running or finished.
  useEffect(() => {
    let cancelled = false;
    client
      .query(LatestCsvImportDocument, { botID: botId, platform })
      .then((data) => {
        if (cancelled) return;
        const latest = data.bot?.latestCSVContactsImport ?? null;
        if (!latest || dismissedRef.current === latest.id) return;
        setImported(latest);
        setRestored(true);
        setFileName(null);
      })
      .catch(() => {
        /* No previous import is the common case and reads as an error here. */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, platform]);

  // Live counters while it runs.
  const importId = imported?.id ?? null;
  const running = isRunning(imported);
  useEffect(() => {
    if (importId === null || !running) return undefined;
    return client.subscribe(
      CsvImportUpdatedDocument,
      { botID: botId, importID: importId },
      {
        next: (data) => setImported(data.csvContactImportUpdated),
        error: () => {
          /* The import finishes server-side regardless; the panel simply stops
             counting. Reopening the wizard re-reads it through
             `latestCSVContactsImport`. */
        },
      },
    );
  }, [client, botId, importId, running]);

  // The rejected-rows file exists only after the end, and often not at all.
  const finished = isFinished(imported);
  useEffect(() => {
    if (!finished) {
      setErrorsFileUrl(null);
      setErrorsFileNote(null);
      return undefined;
    }
    let cancelled = false;
    client
      .query(CsvImportErrorsFileDocument, { botID: botId, platform })
      .then((data) => {
        if (cancelled) return;
        setErrorsFileUrl(data.bot?.latestCSVContactsImport?.errorsFile?.url ?? null);
        setErrorsFileNote(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorsFileUrl(null);
        setErrorsFileNote(errorsFileSentence(codeOf(err)));
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, platform, finished, importId]);

  const setPlatform = useCallback((next: Platform) => {
    dismissedRef.current = null;
    setPlatformState(next);
    setImported(null);
    setDrafts([]);
    setFileName(null);
    setError(null);
    setRestored(false);
  }, []);

  const setColumn = useCallback((index: number, attributeName: string | null) => {
    setDrafts((current) => setColumnAttribute(current, index, attributeName));
  }, []);

  /**
   * Upload, then either create the import or swap the file of the one that
   * exists. A finished import is never swapped into — that would be
   * `CSVContactImportAlreadyFinished`; it is replaced.
   */
  const pickFile = useCallback(
    async (file: File) => {
      const upload = client.uploadFile;
      if (!upload) return;
      setUploading(true);
      setError(null);
      try {
        const uploaded = await upload(botId, file, 'Document');
        const reusable = imported && !isRunning(imported) && !isFinished(imported) ? imported : null;
        const data = reusable
          ? await client.mutate(CsvImportUpdateFileDocument, {
              botID: botId,
              id: reusable.id,
              fileID: uploaded.id,
            })
          : await client.mutate(CsvImportCreateDocument, {
              botID: botId,
              fileID: uploaded.id,
              platform,
              locale: DashboardLocale.En,
            });
        const next =
          'csvContactImportUpdateFile' in data ? data.csvContactImportUpdateFile : data.csvContactImportCreate;
        dismissedRef.current = null;
        setImported(next);
        setRestored(false);
        setFileName(file.name);
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setUploading(false);
      }
    },
    [client, botId, platform, imported],
  );

  /**
   * Save the mapping and start, in that order and always both.
   *
   * `csvContactImportUpdateColumns` is sent even when nothing was edited: the
   * backend's guess is what it already holds, so re-sending it is a no-op, and
   * the alternative is tracking a dirty flag whose only failure mode is
   * starting an import with a mapping the user thought they had changed.
   */
  const start = useCallback(async () => {
    if (!imported) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await client.mutate(CsvImportUpdateColumnsDocument, {
        botID: botId,
        importID: imported.id,
        request: columnsRequest(drafts),
      });
      setImported(saved.csvContactImportUpdateColumns);
      const started = await client.mutate(CsvImportStartDocument, {
        botID: botId,
        importID: imported.id,
      });
      setImported(started.csvContactImportStart);
      setRestored(false);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }, [client, botId, imported, drafts]);

  const reset = useCallback(() => {
    dismissedRef.current = imported?.id ?? null;
    setImported(null);
    setDrafts([]);
    setFileName(null);
    setError(null);
    setRestored(false);
    setErrorsFileUrl(null);
    setErrorsFileNote(null);
  }, [imported]);

  return {
    supported,
    platform,
    setPlatform,
    whatsappConnected,
    step: stepFor(imported),
    imported,
    restored,
    drafts,
    setColumn,
    fileName,
    uploading,
    busy,
    error,
    errorsFileUrl,
    errorsFileNote,
    pickFile,
    start,
    reset,
  };
}
