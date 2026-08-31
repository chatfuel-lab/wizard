import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatfuelGraphQLError } from '~api';
import {
  ContactsExportCancelDocument,
  ContactsExportRestoreDocument,
  CsvExportByIDsDocument,
  CsvExportBySegmentDocument,
  ExportTaskStatusDocument,
  ExportTaskUpdatedDocument,
  type Platform,
  type SegmentInput,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import {
  chunkIds,
  exportErrorSentence,
  isActive,
  isTerminal,
  readExportTask,
  type ExportProgress,
  type ExportTaskLike,
} from '../lib/csvColumns';
import { ALL_PLATFORMS } from '../lib/platforms';

/**
 * A CSV export from "start" to a file (or to several), with the four things
 * that make it survivable rather than a spinner that lies. Every one of them
 * is an API fact, not a preference:
 *
 * 1. **Progress is determinate, when the server says so.** `completedPoints` /
 *    `totalPoints` come off the task; the bar goes indeterminate only while
 *    the server has published no total yet.
 * 2. **Cancel takes `task.data.id`, and the mutation answers with the Bot.**
 *    `csvContactExportCancel(botID, id: String!)` wants `CSVContactsExport.id`
 *    while `getTask(id: TaskID!)` wants `Task.id`, and the response carries no
 *    task at all — so the cancel is followed by a re-read of the task rather
 *    than by an assumption. **The cancel also loses the race** on a small
 *    export (the probe went Created → Cancelled → InProgress → Finished and
 *    produced a file), which is why nothing here sets a `cancelled` phase by
 *    hand.
 * 3. **An export survives a reload.** `bot.lastActiveCSVContactsExportTask`
 *    returns only *active* tasks, so adopting it on mount is exactly right —
 *    a finished export reads as null and cannot pop a stale download panel.
 * 4. **A big selection is several exports.** `csvContactExportStartByIDsList`
 *    caps the id list, so a selection over the cap runs as a queue of tasks,
 *    one file each, in order. The alternative — quietly exporting the segment
 *    instead — would hand back a different set of contacts than the one that
 *    was selected.
 *
 * Both channels run at once. The subscription is the fast path; the poll is
 * what keeps the bar moving when the socket is quiet, and it is the only one
 * that survives a backgrounded tab throttling timers.
 */

const POLL_MS = 2000;

export interface ExportFile {
  /** "Contacts" or "Part 2 of 3" — what this file covers. */
  label: string;
  url: string;
}

export interface ContactExportState {
  progress: ExportProgress | null;
  /** Files finished so far. More than one only when a selection was chunked. */
  files: ExportFile[];
  /** 1-based; both 1 for a single-task export. */
  chunkIndex: number;
  chunkCount: number;
  starting: boolean;
  cancelling: boolean;
  /** True once a cancel was asked for — the note about the race depends on it. */
  cancelRequested: boolean;
  error: string | null;
  /** True when this export was picked up on mount rather than started here. */
  restored: boolean;
  startBySegment: (
    segment: SegmentInput | null,
    attributes: readonly string[],
    platforms?: readonly Platform[],
  ) => Promise<void>;
  startByIds: (contactIds: readonly string[], attributes: readonly string[]) => Promise<void>;
  cancel: () => Promise<void>;
  /** Forget a finished export so the panel can close. */
  clear: () => void;
}

const codeOf = (err: unknown): string | null => (err instanceof ChatfuelGraphQLError ? (err.code ?? null) : null);

const messageOf = (err: unknown): string =>
  exportErrorSentence(codeOf(err), err instanceof Error ? err.message : String(err));

export function useContactExport(): ContactExportState {
  const { client, botId } = useContacts();
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  /* The remaining id chunks, and how many there were. A ref rather than state:
     the effect that starts the next chunk must read the queue as it is at that
     instant, not as it was when the effect was created. */
  const queueRef = useRef<string[][]>([]);
  const [chunkTotal, setChunkTotal] = useState(1);
  const [chunkIndex, setChunkIndex] = useState(1);
  const attributesRef = useRef<string[]>([]);
  /* A cleared export must not be resurrected by an in-flight poll or a late
     subscription frame; a collected file must not be collected twice. */
  const dismissedRef = useRef<string | null>(null);
  const collectedRef = useRef<Set<string>>(new Set());

  const adopt = useCallback((task: ExportTaskLike | null | undefined) => {
    if (!task) return;
    const next = readExportTask(task);
    if (dismissedRef.current === next.taskId) return;
    setProgress(next);
  }, []);

  // Mount: pick an export back up, but only one that is still running.
  useEffect(() => {
    let cancelled = false;
    client
      .query(ContactsExportRestoreDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const task = data.bot?.lastActiveCSVContactsExportTask;
        if (!task) return;
        const current = readExportTask(task);
        if (!isActive(current)) return;
        setProgress(current);
        setRestored(true);
      })
      .catch(() => {
        /* Nothing to restore is the common case; a failure here is not an error
           the user needs to see before they have asked for anything. */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  // Follow the task while it runs: subscription for latency, poll for truth.
  const taskId = progress?.taskId ?? null;
  const running = isActive(progress);

  useEffect(() => {
    if (taskId === null || !running) return undefined;

    const unsubscribe = client.subscribe(
      ExportTaskUpdatedDocument,
      { id: taskId },
      {
        next: (data) => adopt(data.taskUpdated),
        error: () => {
          /* The poll below is the fallback — a dead socket must not strand the bar. */
        },
      },
    );

    const timer = setInterval(() => {
      client
        .query(ExportTaskStatusDocument, { id: taskId })
        .then((data) => adopt(data.getTask))
        .catch(() => {
          /* transient — the next tick tries again */
        });
    }, POLL_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [client, taskId, running, adopt]);

  const runStart = useCallback(async (run: () => Promise<ExportTaskLike | null | undefined>) => {
    setStarting(true);
    setError(null);
    try {
      const task = await run();
      if (!task) {
        setError('The export did not start.');
        return false;
      }
      dismissedRef.current = null;
      setProgress(readExportTask(task));
      return true;
    } catch (err) {
      setError(messageOf(err));
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  const startChunk = useCallback(
    (ids: readonly string[]) =>
      runStart(async () => {
        const data = await client.mutate(CsvExportByIDsDocument, {
          botID: botId,
          contactIDs: [...ids],
          attributes: [...attributesRef.current],
        });
        return data.csvContactExportStartByIDsList;
      }),
    [runStart, client, botId],
  );

  /* A finished chunk hands over its file and pulls the next one. Keyed on the
     task id in `collectedRef` so a subscription frame and a poll tick
     delivering the same "done" cannot queue the next chunk twice. */
  useEffect(() => {
    if (!progress || !isTerminal(progress.phase)) return;
    if (collectedRef.current.has(progress.taskId)) return;
    collectedRef.current.add(progress.taskId);

    if (progress.fileUrl) {
      const label = chunkTotal > 1 ? `Part ${chunkIndex} of ${chunkTotal}` : 'Contacts';
      const url = progress.fileUrl;
      setFiles((current) => (current.some((file) => file.url === url) ? current : [...current, { label, url }]));
    }

    /* A failed or cancelled chunk stops the queue: the remaining parts would
       produce a set of files with a hole in it that nothing on screen could
       describe. */
    if (progress.phase !== 'done') {
      queueRef.current = [];
      return;
    }
    const next = queueRef.current.shift();
    if (!next) return;
    setChunkIndex((n) => n + 1);
    void startChunk(next);
  }, [progress, chunkIndex, chunkTotal, startChunk]);

  const startBySegment = useCallback(
    async (
      segment: SegmentInput | null,
      attributes: readonly string[],
      platforms: readonly Platform[] = ALL_PLATFORMS,
    ) => {
      queueRef.current = [];
      attributesRef.current = [...attributes];
      setFiles([]);
      setRestored(false);
      setCancelRequested(false);
      setChunkTotal(1);
      setChunkIndex(1);
      await runStart(async () => {
        const data = await client.mutate(CsvExportBySegmentDocument, {
          botID: botId,
          platforms: [...platforms],
          segment,
          attributes: [...attributes],
        });
        return data.csvContactExportStartBySegment;
      });
    },
    [runStart, client, botId],
  );

  const startByIds = useCallback(
    async (contactIds: readonly string[], attributes: readonly string[]) => {
      const chunks = chunkIds(contactIds);
      if (chunks.length === 0) {
        setError('Nothing is selected, so there is nothing to export.');
        return;
      }
      attributesRef.current = [...attributes];
      queueRef.current = chunks.slice(1);
      setFiles([]);
      setRestored(false);
      setCancelRequested(false);
      setChunkTotal(chunks.length);
      setChunkIndex(1);
      await startChunk(chunks[0]);
    },
    [startChunk],
  );

  /**
   * Cancel, then look.
   *
   * The mutation returns the Bot, so its answer says nothing about the task —
   * and the server may finish the export anyway. So: send the cancel (data id
   * first, task id as the fallback), drop any queued chunks, and re-read the
   * task. Whatever the task then says is what the UI reports.
   */
  const cancel = useCallback(async () => {
    if (!progress) return;
    setCancelling(true);
    setCancelRequested(true);
    setError(null);
    queueRef.current = [];
    const attempt = (id: string) => client.mutate(ContactsExportCancelDocument, { botID: botId, id });
    try {
      try {
        await attempt(progress.cancelId ?? progress.taskId);
      } catch (err) {
        if (progress.cancelId === null || progress.cancelId === progress.taskId) throw err;
        await attempt(progress.taskId);
      }
      const data = await client.query(ExportTaskStatusDocument, { id: progress.taskId });
      adopt(data.getTask);
    } catch (err) {
      /* `CSVContactExportDoesNotExist` means the task is already gone — the
         cancel got what it wanted, so it is not an error to show. */
      if (codeOf(err) !== 'CSVContactExportDoesNotExist') setError(messageOf(err));
    } finally {
      setCancelling(false);
    }
  }, [client, botId, progress, adopt]);

  const clear = useCallback(() => {
    dismissedRef.current = progress?.taskId ?? null;
    queueRef.current = [];
    setProgress(null);
    setFiles([]);
    setRestored(false);
    setCancelRequested(false);
    setChunkTotal(1);
    setChunkIndex(1);
    setError(null);
  }, [progress]);

  return {
    progress,
    files,
    chunkIndex,
    chunkCount: chunkTotal,
    starting,
    cancelling,
    cancelRequested,
    error,
    restored,
    startBySegment,
    startByIds,
    cancel,
    clear,
  };
}
