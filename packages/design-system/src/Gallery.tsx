import { useState, type ReactNode } from 'react';
import { ThemeToggle } from '~ui';
import { TokensSection } from './Tokens';
import { PrimitivesSection } from './demos/Primitives';
import { FormsSection } from './demos/Forms';
import { FloatingSection } from './demos/Floating';
import { DataDisplaySection } from './demos/DataDisplay';
import { FeedbackSection } from './demos/Feedback';
import { DndSection } from './demos/Dnd';
import { ChatShellSection } from './demos/ChatShell';
import { AssistantSection } from './demos/Assistant';
import { LayoutSection } from './demos/Layout';
import { CanvasSection } from './demos/Canvas';
import { CalendarSection } from './demos/Calendar';
import { MediaSection } from './demos/Media';
import { AuthSection } from './demos/Auth';

interface View {
  id: string;
  label: string;
  blurb: string;
  render: () => ReactNode;
}

const VIEWS: View[] = [
  {
    id: 'tokens',
    label: 'Tokens',
    blurb:
      'Values are read live from the CSS custom properties in content/ui/src/styles/tokens.css — click any chip to copy the token or its utility class.',
    render: () => <TokensSection />,
  },
  {
    id: 'primitives',
    label: 'Primitives',
    blurb: 'Buttons, surfaces, status and the icon set — the pieces everything else is assembled from.',
    render: () => <PrimitivesSection />,
  },
  {
    id: 'forms',
    label: 'Forms',
    blurb: 'Inputs and controls. Every one of them is controlled and keyboard-complete.',
    render: () => <FormsSection />,
  },
  {
    id: 'floating',
    label: 'Floating',
    blurb:
      'Popover, menu, tooltip and the command palette — all built from the same positioning, presence and layer hooks.',
    render: () => <FloatingSection />,
  },
  {
    id: 'data',
    label: 'Data',
    blurb: 'The table, its paging and disclosure. Fully controlled, because the rows arrive live.',
    render: () => <DataDisplaySection />,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    blurb: 'Toasts, dialogs and drawers — everything that appears over the page and has to leave again.',
    render: () => <FeedbackSection />,
  },
  {
    id: 'dnd',
    label: 'Drag & drop',
    blurb:
      'The Pointer Events primitive, against a board shaped like the real one: six columns, a collapsed rail, edge auto-scroll and touch.',
    render: () => <DndSection />,
  },
  {
    id: 'media',
    label: 'Media',
    blurb:
      'Pictures, and the frames they are seen in. The preview is the one part of a composer that is not a form field — it answers what a post will look like, which is a different question from what will be sent.',
    render: () => <MediaSection />,
  },
  {
    id: 'chat',
    label: 'Chat & shell',
    blurb:
      'Conversation surfaces and the app frame. The thread demo is interactive on purpose — the virtualized list, its bottom anchoring and the unread rule only show what they do when you scroll up and push messages at them.',
    render: () => <ChatShellSection />,
  },
  {
    id: 'assistant',
    label: 'Assistant',
    blurb:
      'What the model is doing, as opposed to what it said: markdown that stays stable while it is still arriving, a tool call as a step rather than a grey line of prose, and the arguments of a real pending approval as something a person can actually read before saying yes. The streamed message replays on a loop — watch the half-written bold run and the unclosed fence, which never restructure into something else when the next chunk lands.',
    render: () => <AssistantSection />,
  },
  {
    id: 'canvas',
    label: 'Canvas',
    blurb:
      'The pan-and-zoom canvas that replaces @xyflow/react, on a scene shaped like the flow builder. Every gesture the flow builder needs has to work here before the swap starts — so the readout counts the nodes actually rendered, and the rebuild switch replaces the whole graph four times a second while you drag it.',
    render: () => <CanvasSection />,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    blurb:
      'The time grid, month grid and the pickers the Bookings module is built from — FullCalendar-class interactions on the design system: move, resize, drag-to-create with a 15-minute snap, keyboard grab with a live region, touch hold, three densities, and the eight-tone event palette. Every demo mutates local state and logs what the module would receive.',
    render: () => <CalendarSection />,
  },
  {
    id: 'auth',
    label: 'Auth',
    blurb:
      'The unauthenticated pages and the account chrome: AuthLayout as a container-width card, the sign-in composition on FormField + PasswordInput, the copy field, the avatar menu, the danger card, and DataCards — the compact-band twin of DataTable, rendered from the same column set.',
    render: () => <AuthSection />,
  },
  {
    id: 'layout',
    label: 'Layout',
    blurb:
      'Page templates and the band system, each inside a container you can drag. The browser window never moves — modules lay themselves out for the box they were given, because an embed can be 700px wide inside a 2560px screen.',
    render: () => <LayoutSection />,
  },
];

export function Gallery() {
  const [viewId, setViewId] = useState('tokens');
  const view = VIEWS.find((each) => each.id === viewId) ?? VIEWS[0]!;

  return (
    <div className="min-h-screen bg-surface font-sans text-text">
      <header className="sticky top-0 z-rail border-b border-border bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
          <h1 className="text-sm font-semibold">Chatfuel design system</h1>
          <span className="font-mono text-micro text-text-faint">content/ui</span>
          <ThemeToggle className="ml-auto" />
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-6 pb-2.5">
          {VIEWS.map((each) => (
            <button
              key={each.id}
              type="button"
              onClick={() => setViewId(each.id)}
              className={
                viewId === each.id
                  ? 'rounded-chip bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent focus-visible:focus-ring'
                  : 'rounded-chip px-3 py-1.5 text-xs font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring'
              }
            >
              {each.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <p className="mb-6 max-w-3xl text-xs leading-relaxed text-text-muted">{view.blurb}</p>
        {view.render()}
      </main>
    </div>
  );
}
