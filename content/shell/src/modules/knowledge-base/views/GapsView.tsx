import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconBook,
  IconLock,
  IconRefresh,
  PageBody,
  Progress,
  Skeleton,
  Switch,
  Toolbar,
  useToast,
} from '~ui';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { GapClusterCard } from '../components/gaps/GapClusterCard';
import { GapScanIntro } from '../components/gaps/GapScanIntro';
import { ScanNotes } from '../components/gaps/ScanNotes';
import { useGapIgnore } from '../hooks/useGapIgnore';
import { useGapScan } from '../hooks/useGapScan';
import { MAX_CONVERSATIONS, MAX_PAGES } from '../lib/gapScanPolicy';
import { announceScan } from '../lib/announce';
import { buildClusters, isIgnored } from '../lib/gaps';
import type { KnowledgeViewProps } from './types';

/**
 * Gaps: the questions the assistant handed to a human, grouped.
 *
 * The one source on this page that is not the Fuely record. It reads
 * CONVERSATIONS, which is why it is gated on `Inbox: View` rather than on
 * `Ai: Edit`, and why the sweep is a button rather than a mount effect - see
 * `hooks/useGapScan.ts` for what one costs.
 *
 * Everything the page decides is in `lib/gaps.ts` and tested there: which chats
 * count as gone wrong, which message was the question, how two phrasings become
 * one row, and which rows an FAQ already covers. This file is the shape of it
 * on screen and nothing else.
 */
export function GapsView(props: KnowledgeViewProps) {
  const { role } = props;

  if (role.loading) {
    return (
      <PageBody>
        <Skeleton variant="block" height="10rem" />
      </PageBody>
    );
  }

  /* The gate is a component boundary, not a branch inside one: without the
   * permission there is nothing to load, and the hooks below would still have
   * issued their reads. */
  if (!role.canReadInbox) {
    return (
      <PageBody>
        <EmptyState
          icon={<IconLock />}
          title="You cannot read this bot's conversations"
          description="Gaps is built from the chats your assistant handed to a person, so it needs the Inbox permission — View is enough. Ask an admin of this bot to grant it; every other knowledge source works without it."
        />
      </PageBody>
    );
  }

  return <GapsReport {...props} />;
}

function GapsReport({ onParams, onBusy, canEditHere }: KnowledgeViewProps) {
  const store = useKnowledge();
  const scan = useGapScan();
  const ignoreList = useGapIgnore();
  const toast = useToast();
  const [showIgnored, setShowIgnored] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announcedRef = useRef<number | null>(null);

  const { phase, progress, samples, error, stopped, reachedContactCap, reachedConversationCap, finishedAt } =
    scan.state;
  const scanning = phase === 'scanning';

  /* Frozen at the end of the sweep: "40 min ago" recomputed on every render
   * would rewrite the list while somebody is reading it. */
  const now = finishedAt ?? Date.now();

  const clusters = useMemo(() => buildClusters(samples, store.state.faqs), [samples, store.state.faqs]);
  const visible = useMemo(
    () => clusters.filter((cluster) => !isIgnored(cluster, ignoreList.ignored)),
    [clusters, ignoreList.ignored],
  );
  const hidden = useMemo(
    () => clusters.filter((cluster) => isIgnored(cluster, ignoreList.ignored)),
    [clusters, ignoreList.ignored],
  );

  useEffect(() => {
    onBusy(scanning);
    /* The header's spinner belongs to the workspace, which outlives this page. */
    return () => onBusy(false);
  }, [onBusy, scanning]);

  useEffect(() => {
    if (phase !== 'done' || finishedAt === null || announcedRef.current === finishedAt) return;
    announcedRef.current = finishedAt;
    setAnnouncement(announceScan(progress.swept, clusters.length));
  }, [phase, finishedAt, progress.swept, clusters.length]);

  const createFaq = useCallback((question: string) => onParams({ source: 'faq', draft: question }), [onParams]);
  const openFaq = useCallback((key: string) => onParams({ source: 'faq', item: key }), [onParams]);

  const ignore = useCallback(
    (question: string) => {
      ignoreList.ignore(question);
      toast.show({
        title: 'Ignored',
        description: 'It stays hidden for you on this bot. Your teammates still see it.',
        action: { label: 'Undo', onClick: () => ignoreList.restore(question) },
      });
    },
    [ignoreList, toast],
  );

  const toRead = Math.min(progress.flagged, MAX_CONVERSATIONS);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        {scanning ? (
          <Button variant="secondary" size="sm" onClick={scan.cancel}>
            Stop
          </Button>
        ) : phase === 'idle' ? null : (
          /* Nothing here before the first sweep: the intro card owns that
             button, and two "Scan conversations" on one screen is one. */
          <Button variant="secondary" size="sm" onClick={scan.start}>
            <IconRefresh />
            Rescan
          </Button>
        )}

        {phase === 'done' ? (
          <p className="min-w-0 text-meta text-text-muted">
            Swept {progress.swept} {progress.swept === 1 ? 'chat' : 'chats'} · {progress.flagged} handed to a person ·{' '}
            {visible.length} {visible.length === 1 ? 'question' : 'distinct questions'}
          </p>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {hidden.length > 0 ? (
            <Switch checked={showIgnored} onChange={setShowIgnored} label={`Show ignored (${hidden.length})`} />
          ) : null}
        </div>
      </Toolbar>

      <PageBody measure="app">
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {phase === 'idle' ? <GapScanIntro onScan={scan.start} /> : null}

        {scanning ? (
          <div className="mx-auto w-full max-w-prose">
            <Card title="Reading conversations">
              {/* Indeterminate on purpose: how many chats were handed over is
                  not known until the list has been paged, and a bar that
                  guessed would be a made-up number in a page about honesty. */}
              <Progress label="Scanning conversations" size="sm" />
              <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-meta @compact:grid-cols-2">
                <dt className="text-text-muted">Chat list</dt>
                <dd className="tabular-nums text-text">
                  page {progress.pages} of {MAX_PAGES}
                </dd>
                <dt className="text-text-muted">Chats swept</dt>
                <dd className="tabular-nums text-text">{progress.swept}</dd>
                <dt className="text-text-muted">Handed to a person</dt>
                <dd className="tabular-nums text-text">{progress.flagged}</dd>
                <dt className="text-text-muted">Conversations read</dt>
                <dd className="tabular-nums text-text">
                  {progress.read} of {toRead}
                </dd>
              </dl>
            </Card>
          </div>
        ) : null}

        {phase === 'error' ? (
          <Alert
            tone="danger"
            title="The scan could not finish"
            action={
              <Button variant="secondary" size="sm" onClick={scan.start}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        {phase === 'done' && !ignoreList.loaded ? <Skeleton variant="block" height="8rem" /> : null}

        {phase === 'done' && ignoreList.loaded ? (
          <div className="flex flex-col gap-3">
            <ScanNotes
              stopped={stopped}
              swept={progress.swept}
              read={progress.read}
              flagged={progress.flagged}
              contactCap={reachedContactCap}
              conversationCap={reachedConversationCap}
            />

            {visible.length === 0 ? (
              /* Three different empty results, and telling a person "nothing to
                 write" when the truth is "nothing was readable" would send them
                 away believing their FAQ is finished. */
              <EmptyState
                icon={<IconBook />}
                title={
                  progress.flagged === 0
                    ? 'No chat was handed to a person'
                    : clusters.length === 0
                      ? 'No question was readable'
                      : 'Nothing left on the list'
                }
                description={
                  progress.flagged === 0
                    ? `The assistant handled all ${progress.swept} chats it was asked about. A hand-off that a teammate opened and then handed back to the AI leaves nothing behind, so it would not appear here either.`
                    : clusters.length === 0
                      ? `${progress.flagged} chats went to a person, and none of them had a typed question before the hand-off — a voice note, a photo or a button press carries no text to read.`
                      : 'Every question this sweep found is on your ignored list.'
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((cluster) => (
                  <li key={cluster.id}>
                    <GapClusterCard
                      cluster={cluster}
                      now={now}
                      canEdit={canEditHere}
                      onCreateFaq={createFaq}
                      onOpenFaq={openFaq}
                      onIgnore={ignore}
                    />
                  </li>
                ))}
              </ul>
            )}

            {showIgnored && hidden.length > 0 ? (
              <>
                <h2 className="mt-2 text-label font-semibold text-text-muted">Ignored by you</h2>
                <ul className="flex flex-col gap-3">
                  {hidden.map((cluster) => (
                    <li key={cluster.id}>
                      <GapClusterCard
                        cluster={cluster}
                        now={now}
                        canEdit={canEditHere}
                        onCreateFaq={createFaq}
                        onOpenFaq={openFaq}
                        onIgnore={ignore}
                        ignored
                        onRestore={ignoreList.restore}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </PageBody>
    </div>
  );
}
