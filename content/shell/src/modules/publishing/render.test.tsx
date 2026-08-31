import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModuleRoot, ToastProvider } from '~ui';
import { createTestClient } from '../testClient';
import { PublishingApp } from './PublishingApp';
import { PublishingContext } from './PublishingContext';
import { PublishingQueueContext } from './PublishingQueueContext';
import { usePostsStore } from './hooks/usePostsStore';
import type { PostsStore } from './hooks/usePostsStore';
import { parseAddress } from './lib/publishingParams';
import { orderOf } from './lib/postsStore';
import type { QueuedPost } from './types';
import { CalendarView } from './views/CalendarView';
import { LibraryView } from './views/LibraryView';
import { QueueView } from './views/QueueView';
import type { PublishingViewProps } from './views/types';
import { sampleAccount } from './lib/samples';
import { initialPostsState } from './lib/postsStore';
import { emptyDraft } from './lib/composerDraft';
import type { MediaSources } from './hooks/useMediaSources';
import type { MediaItem, NewPost, PostKind } from './types';
import { PublishingCommandPalette } from './components/PublishingCommandPalette';
import type { PublishingCommandHandlers } from './lib/commands';
import { ComposerModal } from './components/composer/ComposerModal';
import { ComposerForm } from './components/composer/ComposerForm';
import { ScheduleButton } from './components/composer/ScheduleButton';

/**
 * The white-screen guard.
 *
 * This suite runs without a browser, so nothing else here can see a component
 * that throws on its first render — it type-checks, it passes every gate, and it
 * renders nothing. Rendering to a string needs no DOM: effects do not run, so
 * what this asserts is the frame around the data, which is exactly the part a
 * broken component takes down with it.
 *
 * The composer's own panes are rendered directly as well as through the modal.
 * A modal is portalled to the document, and a portal on the server is nothing
 * at all, so mounting the modal proves the wiring holds and proves nothing
 * about what is inside it.
 */
describe('the module renders', () => {
  const render = (view = '', query = '') =>
    renderToStaticMarkup(
      <PublishingApp
        botId="bot-1"
        client={createTestClient()}
        view={view}
        setView={() => undefined}
        params={new URLSearchParams(query)}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );

  it('mounts, and draws its frame before any data arrives', () => {
    const html = render();
    expect(html).toContain('Publishing');
    expect(html).toContain('aria-label="View"');
    expect(html).toContain('Calendar');
    expect(html).toContain('Queue');
    expect(html).toContain('Library');
  });

  it('mounts on each of its three views', () => {
    for (const view of ['', 'queue', 'library', 'nonsense']) {
      expect(() => render(view)).not.toThrow();
    }
  });
});

/**
 * The palette, which the module render above cannot reach: it is portalled, and
 * a portal on the server is nothing at all. Mounting it here proves the icon
 * map and the groups it is handed hold together — which commands appear in
 * which state is `lib/commands.test.ts`.
 */
describe('the command palette mounts', () => {
  const handlers: PublishingCommandHandlers = {
    setView: () => undefined,
    setMode: () => undefined,
    setStatus: () => undefined,
    setKind: () => undefined,
    newPost: () => undefined,
    today: () => undefined,
    refresh: () => undefined,
    pullLibrary: () => undefined,
    openShortcuts: () => undefined,
  };

  it('mounts open and closed, on every view', () => {
    for (const view of ['calendar', 'queue', 'library'] as const) {
      for (const open of [true, false]) {
        expect(() =>
          renderToStaticMarkup(
            <PublishingCommandPalette
              open={open}
              onClose={() => undefined}
              context={{
                view,
                requestedMode: 'month',
                mode: 'month',
                status: null,
                kind: null,
                accountReady: true,
              }}
              handlers={handlers}
            />,
          ),
        ).not.toThrow();
      }
    }
  });
});

/**
 * The views themselves, under their providers.
 *
 * `PublishingApp` cannot reach them from here: effects do not run in a
 * server-side render, so the account gate is still `loading` and the workspace
 * draws a spinner instead of a view. The harness below supplies the same
 * providers and the same frozen props and renders the view directly, which is
 * the only way this suite can see a view that throws on its first render.
 */
const VIEWS = { queue: QueueView, library: LibraryView };

function Harness({ view, query = '' }: { view: keyof typeof VIEWS; query?: string }) {
  /* Nothing in this component may consume the contexts it renders: a hook that
     needs a provider runs before the provider it is written above exists. */
  const client = createTestClient();
  const queue = usePostsStore(client, 'bot-1');
  const props: PublishingViewProps = {
    band: 'wide',
    address: parseAddress(view, new URLSearchParams(query)),
    patch: () => undefined,
    onCompose: () => undefined,
    onBusy: () => undefined,
    refreshToken: 0,
    rootRef: createRef<HTMLElement>(),
    account: sampleAccount,
  };
  const View = VIEWS[view];
  return (
    <ToastProvider>
      <PublishingContext.Provider value={{ client, botId: 'bot-1' }}>
        <PublishingQueueContext.Provider value={queue}>
          <ModuleRoot>
            <View {...props} />
          </ModuleRoot>
        </PublishingQueueContext.Provider>
      </PublishingContext.Provider>
    </ToastProvider>
  );
}

describe('the queue view renders', () => {
  const draw = (query = '') => renderToStaticMarkup(<Harness view="queue" query={query} />);

  it('draws its own filter before any post has arrived', () => {
    const html = draw();
    expect(html).toContain('aria-label="Status"');
    // Every status is offered whether or not anything is in it.
    for (const label of ['Draft', 'Scheduled', 'Publishing', 'Published', 'Failed']) {
      expect(html).toContain(label);
    }
  });

  it('survives every value the filter can hold, and one it cannot', () => {
    for (const status of ['draft', 'scheduled', 'publishing', 'published', 'failed', 'exploded']) {
      expect(() => draw(`status=${status}`)).not.toThrow();
    }
  });
});

describe('the library view renders', () => {
  const draw = (query = '') => renderToStaticMarkup(<Harness view="library" query={query} />);

  it('draws its own filter and the pull-from-Instagram action', () => {
    const html = draw();
    expect(html).toContain('aria-label="Media kind"');
    expect(html).toContain('Refresh from Instagram');
    for (const label of ['Posts', 'Carousels', 'Reels', 'Stories', 'Ads']) {
      expect(html).toContain(label);
    }
  });

  it('survives every kind the address can carry, ads included', () => {
    for (const kind of ['post', 'carousel', 'reel', 'story', 'ad', 'purple']) {
      expect(() => draw(`kind=${kind}`)).not.toThrow();
    }
  });
});

/**
 * The calendar, on its own.
 *
 * The workspace above it answers the account gate first, so a render of the
 * whole module never reaches a view — which would leave the largest surface in
 * the module with no guard at all. It is mounted here directly, over a queue
 * that is already loaded, in every shape it can be drawn in.
 */
describe('the calendar renders', () => {
  const post = (over: Partial<QueuedPost> = {}): QueuedPost => ({
    id: 'p1',
    kind: 'post',
    caption: 'A caption',
    media: [{ id: 'm1', type: 'image', url: 'https://example.com/a.jpg', source: 'link' }],
    scheduledAt: '2026-08-19T09:00:00.000Z',
    status: 'scheduled',
    attempts: 0,
    mediaId: null,
    permalink: null,
    error: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  });

  const queueOf = (posts: QueuedPost[], loading = false): PostsStore => {
    const byId = Object.fromEntries(posts.map((one) => [one.id, one]));
    const never = <T,>(): Promise<T> => new Promise<T>(() => undefined);
    return {
      state: { byId, order: orderOf(byId), pending: [], loading, error: null, epoch: 1 },
      backend: null,
      canSchedule: true,
      refresh: () => undefined,
      save: never,
      patch: never,
      remove: never,
      dispatch: () => undefined,
    };
  };

  const render = (query: string, posts: QueuedPost[], loading = false) =>
    renderToStaticMarkup(
      <ToastProvider>
        <PublishingQueueContext.Provider value={queueOf(posts, loading)}>
          <CalendarView
            band="wide"
            address={parseAddress('', new URLSearchParams(query))}
            patch={() => undefined}
            onCompose={() => undefined}
            onBusy={() => undefined}
            refreshToken={0}
            rootRef={createRef<HTMLElement>()}
            account={sampleAccount}
          />
        </PublishingQueueContext.Provider>
      </ToastProvider>,
    );

  const posts = [
    post({ id: 'a', caption: 'Harbour sunset', scheduledAt: '2026-08-19T09:00:00.000Z' }),
    post({
      id: 'b',
      caption: 'Behind the counter',
      scheduledAt: '2026-08-19T12:30:00.000Z',
      kind: 'reel',
      status: 'failed',
      error: 'Instagram said no',
    }),
    post({
      id: 'c',
      caption: 'Closing time',
      scheduledAt: '2026-08-28T12:00:00.000Z',
      kind: 'story',
      status: 'published',
      permalink: 'https://example.com/p/1/',
    }),
    /* The last day of the previous month: it is on an August grid, because the
       grid is six rows of seven and August 2026 opens on 27 July. */
    post({
      id: 'd',
      caption: 'Last of July',
      scheduledAt: '2026-07-31T12:00:00.000Z',
      kind: 'carousel',
      status: 'draft',
    }),
  ];

  it('draws every mode, on a month it was pointed at', () => {
    for (const mode of ['month', 'week', 'list', 'nonsense']) {
      const html = render(`mode=${mode}&month=2026-08`, posts);
      expect(html).toContain('aria-label="Calendar layout"');
      expect(html).toContain('Month');
      expect(html).toContain('Week');
      expect(html).toContain('List');
    }
  });

  it('places posts on the month grid it was given, neighbouring days included', () => {
    const html = render('mode=month&month=2026-08', posts);
    expect(html.match(/role="gridcell"/g)).toHaveLength(42);
    expect(html).toContain('Harbour sunset');
    expect(html).toContain('Closing time');
    expect(html).toContain('Last of July');
  });

  it('lists every dated post, whatever month the address names', () => {
    const html = render('mode=list&month=2026-01', posts);
    for (const caption of ['Harbour sunset', 'Behind the counter', 'Closing time', 'Last of July']) {
      expect(html).toContain(caption);
    }
  });

  it('marks a failure without a word beside it', () => {
    const html = render('mode=month&month=2026-08', posts);
    expect(html).toContain('ring-danger');
  });

  it('offers a way to write the first post when there is nothing', () => {
    const html = render('mode=month&month=2026-08', []);
    expect(html).toContain('Nothing scheduled');
    expect(html).toContain('New post');
  });

  it('stands in for the grid while the first list is in flight', () => {
    for (const mode of ['month', 'week', 'list']) {
      const html = render(`mode=${mode}`, [], true);
      expect(html).toContain('aria-busy');
      expect(html).not.toContain('Nothing scheduled');
    }
  });

  it('survives an address nobody would type', () => {
    for (const query of ['', 'month=not-a-month', 'month=2026-13', 'mode=purple&month=2026-02']) {
      expect(() => render(query, posts)).not.toThrow();
    }
  });

  it('falls back to the list where a month grid cannot fit', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <PublishingQueueContext.Provider value={queueOf(posts)}>
          <CalendarView
            band="compact"
            address={parseAddress('', new URLSearchParams('mode=month&month=2026-08'))}
            patch={() => undefined}
            onCompose={() => undefined}
            onBusy={() => undefined}
            refreshToken={0}
            rootRef={createRef<HTMLElement>()}
            account={sampleAccount}
          />
        </PublishingQueueContext.Provider>
      </ToastProvider>,
    );
    expect(html).toContain('aria-label="Scheduled posts"');
    /* The choice survives the resize: the control still says Month. */
    expect(html).toContain('aria-label="Calendar layout"');
  });
});

/* -------------------------------------------------------------------------- */
/* The composer                                                               */
/* -------------------------------------------------------------------------- */

const SOURCES: MediaSources = {
  canUpload: true,
  busy: false,
  error: null,
  dismiss: () => undefined,
  add: async () => [],
};

const QUEUE: PostsStore = {
  state: initialPostsState(),
  backend: null,
  canSchedule: true,
  refresh: () => undefined,
  save: async () => {
    throw new Error('not reached');
  },
  patch: async () => {
    throw new Error('not reached');
  },
  remove: async () => undefined,
  dispatch: () => undefined,
};

const photo: MediaItem = {
  id: 'm-1',
  type: 'image',
  url: 'https://example.com/1.jpg',
  source: 'link',
  previewUrl: 'https://example.com/1.jpg',
};

const draftOf = (kind: PostKind, over: Partial<NewPost> = {}): NewPost => ({
  ...emptyDraft(),
  kind,
  media: [photo],
  ...over,
});

const form = (draft: NewPost, sources: MediaSources = SOURCES) =>
  renderToStaticMarkup(
    <ComposerForm
      draft={draft}
      onDraft={() => undefined}
      onAddMedia={() => undefined}
      problems={[]}
      sources={sources}
      onPickLibrary={() => undefined}
    />,
  );

/** The three ways in, by the names they answer to on screen. */
const UPLOAD = 'aria-label="Upload a file"';
const LINK = 'aria-label="Paste a link"';
const LIBRARY = 'aria-label="Media on the account"';
/** The drop tile's second line — the strip's own way in. */

describe('the composer form renders', () => {
  it('offers the four things that can be published, as four tiles of one size', () => {
    const html = form(draftOf('post'));
    expect(html).toContain('aria-label="What to publish"');
    for (const label of ['Post', 'Reel', 'Story', 'Carousel']) expect(html).toContain(label);
    /* One square, four times. Drawing each at its own ratio was true and read
       as a row that had gone wrong; the name under the tile is what is being
       chosen. Asserted on the class rather than an inline width, because the
       size comes off the spacing scale. */
    expect(html.match(/h-11 w-11/g)).toHaveLength(4);
    expect(html).not.toMatch(/width:\d+px/);
  });

  it('wears the draft picture rather than the account, and the glyph before there is one', () => {
    const withPhoto = form(draftOf('post'));
    /* Four crops of one picture — decorative, because the tile's own name is
       what a radio announces and four readings of "Photo 1" say nothing about
       which of the four is on offer. */
    expect(withPhoto.match(/alt=""/g)).toHaveLength(4);
    expect(withPhoto).not.toContain('alt="demo.account"');

    const blank = form(draftOf('post', { media: [] }));
    expect(blank).not.toContain('https://example.com/1.jpg');
    expect(blank).not.toContain('alt=""');
    expect(blank).toContain('aria-label="What to publish"');
  });

  it('mounts for every kind', () => {
    for (const kind of ['post', 'reel', 'story', 'carousel'] as const) {
      expect(() => form(draftOf(kind))).not.toThrow();
    }
  });

  it('gives a story no caption box at all, rather than a disabled one', () => {
    expect(form(draftOf('post'))).toContain('aria-label="Caption"');
    expect(form(draftOf('story'))).not.toContain('aria-label="Caption"');
  });

  it('writes no label over the caption — the box is the label', () => {
    const html = form(draftOf('post'));
    expect(html).toContain('placeholder="Write a caption"');
    expect(html).not.toContain('>Caption<');
  });

  it('shows the reel settings only on a reel', () => {
    expect(form(draftOf('reel'))).toContain('Cover image');
    expect(form(draftOf('post'))).not.toContain('Cover image');
  });

  it('folds the reel settings away rather than unfolding them over the caption', () => {
    /* Rendered, and closed: the disclosure keeps its panel in the tree so the
       content is measurable, so "present" is not the same as "open". */
    expect(form(draftOf('reel'))).toContain('aria-expanded="false"');
    expect(form(draftOf('reel'))).toContain('Reel settings');
  });

  it('counts a caption in codepoints, so emoji do not read double', () => {
    expect(form(draftOf('post', { caption: '👋👋' }))).toMatch(/data-meter="length"[^>]*>2</);
  });

  it('carries bare figures, with no ceiling written beside them', () => {
    /* Read from what is DRAWN, not from the markup: an attribute can carry the
       digits of a limit without anybody being shown them — a drawn thumbnail
       is a data URI full of numbers, and asserting over the raw html made this
       fail on a sample's picture. */
    const text = form(draftOf('post', { caption: '#one #two' })).replace(/<[^>]*>/g, ' ');
    expect(text).toContain('9');
    expect(text).not.toContain('2200');
    expect(text).not.toContain('Hashtags');
  });

  it('says nothing about hashtags until the caption carries one', () => {
    expect(form(draftOf('post', { caption: 'no tags here' }))).not.toContain('data-meter="hashtags"');
    expect(form(draftOf('post', { caption: '#one #two' }))).toMatch(/data-meter="hashtags"[^>]*># 2</);
  });

  it('draws no media region at all until there is media', () => {
    /* The three ways in are the three glyphs on the toolbar. A dashed tile
       beside the photographs was a fourth control saying what one of those
       three already says. */
    const empty = form(draftOf('post', { media: [] }));
    expect(empty).toContain(UPLOAD);
    expect(empty).toContain(LINK);
    expect(empty).toContain(LIBRARY);
    expect(empty).not.toContain('aria-label="Media link"');
    expect(empty).not.toContain('aria-label="Remove Photo 1"');

    expect(form(draftOf('post', { media: [photo] }))).toContain('aria-label="Remove Photo 1"');

    const ten = Array.from({ length: 10 }, (_, i) => ({ ...photo, id: `m-${i}` }));
    expect(() => form(draftOf('carousel', { media: ten }))).not.toThrow();
  });

  it('takes every way in away once the carousel is full', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ ...photo, id: `m-${i}` }));
    const full = form(draftOf('carousel', { media: ten }));
    for (const control of [UPLOAD, LINK, LIBRARY]) expect(full).not.toContain(control);
  });

  it('mounts for a source with no upload path at all', () => {
    const html = form(draftOf('post', { media: [] }), { ...SOURCES, canUpload: false });
    expect(html).toContain(LIBRARY);
    expect(html).toContain(LINK);
    expect(html).not.toContain(UPLOAD);
  });
});

describe('the schedule control renders', () => {
  const button = (value: string | null) =>
    renderToStaticMarkup(
      <ScheduleButton value={value} zone="UTC" onChange={() => undefined} onZone={() => undefined} />,
    );

  it('asks for a time when none is set', () => {
    expect(button(null)).toContain('Pick a time');
  });

  it('states the time once one is', () => {
    const html = button('2026-08-25T08:00:00.000Z');
    expect(html).toContain('Aug');
    expect(html).toContain('8:00');
  });

  it('keeps the pickers behind it rather than on the form', () => {
    /* A closed popover renders no panel, so nothing here is a date field. */
    expect(button(null)).not.toContain('aria-label="Time zone"');
  });
});

describe('the composer modal mounts', () => {
  const modal = (target: string | null, from: string | null = null) =>
    renderToStaticMarkup(
      <ToastProvider>
        <PublishingContext.Provider value={{ client: createTestClient(), botId: 'bot-1' }}>
          <PublishingQueueContext.Provider value={QUEUE}>
            <ModuleRoot>
              <ComposerModal target={target} at={null} from={from} account={sampleAccount} onClose={() => undefined} />
            </ModuleRoot>
          </PublishingQueueContext.Provider>
        </PublishingContext.Provider>
      </ToastProvider>,
    );

  it('mounts closed, on a new post and on one that is not in the queue yet', () => {
    for (const target of [null, 'new', 'a-post-that-has-not-loaded']) {
      expect(() => modal(target)).not.toThrow();
    }
  });

  it('mounts on a new post started from media on the account', () => {
    expect(() => modal('new', 'ig-post-1')).not.toThrow();
  });
});
