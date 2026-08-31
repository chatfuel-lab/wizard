import { useRef, useState } from 'react';
import {
  Button,
  Command,
  ContextMenu,
  Dialog,
  DropdownMenu,
  IconCheck,
  IconDownload,
  IconExternal,
  IconKanban,
  IconLayoutList,
  IconLink,
  IconTrash,
  IconUndo,
  Input,
  Kbd,
  MenuButton,
  Popover,
  Tooltip,
  useHotkeys,
  type HotkeyBinding,
  type MenuItem,
} from '~ui';
import { Demo, Note, Row } from './shared';

const MENU_ITEMS: MenuItem[] = [
  { kind: 'label', id: 'group', label: 'Deal' },
  { id: 'open', label: 'Open contact', icon: <IconExternal size={14} />, onSelect: () => {} },
  { id: 'copy', label: 'Copy link', icon: <IconLink size={14} />, shortcut: ['mod', 'c'], onSelect: () => {} },
  { id: 'export', label: 'Export CSV', icon: <IconDownload size={14} />, onSelect: () => {} },
  { kind: 'separator', id: 's1' },
  { id: 'watch', label: 'Watch this deal', checked: true, onSelect: () => {} },
  { id: 'archive', label: 'Archive', disabled: true, onSelect: () => {} },
  { kind: 'separator', id: 's2' },
  { id: 'remove', label: 'Remove owner', tone: 'danger', icon: <IconTrash size={14} />, onSelect: () => {} },
];

const BINDINGS: HotkeyBinding<'palette' | 'goBoard' | 'goTable' | 'help'>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'goBoard', keys: 'g b' },
  { id: 'goTable', keys: 'g t' },
  { id: 'help', keys: '?' },
];

export function FloatingSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ran, setRan] = useState<string | null>(null);
  const [fired, setFired] = useState<string | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const dialogFieldRef = useRef<HTMLInputElement>(null);

  useHotkeys(
    BINDINGS,
    (id) => {
      if (id === 'palette') setPaletteOpen((open) => !open);
      else setFired(id);
    },
    { rootRef: scopeRef },
  );

  return (
    <div ref={scopeRef} className="space-y-4">
      <Demo name="Popover" tokens="z-popover · surface-overlay · shadow-overlay · animate-scale-in">
        <Note>
          Positioned by <code className="font-mono text-micro">lib/position.ts</code> — flip, then shift, then size.
          Always portalled and <code className="font-mono text-micro">position: fixed</code>, because any transformed
          ancestor would silently become the containing block. Scroll the page while one is open: it tracks the anchor,
          including through ancestor scrollers.
        </Note>
        <Row label="placements">
          {(['bottom-start', 'top', 'right', 'left-end'] as const).map((placement) => (
            <Popover
              key={placement}
              placement={placement}
              aria-label={`Popover ${placement}`}
              trigger={(props) => (
                <Button {...props} variant="ghost" size="sm">
                  {placement}
                </Button>
              )}
            >
              <p className="mb-2 text-xs text-text-muted">Requested: {placement}</p>
              <Input placeholder="Focus is trapped in here" />
            </Popover>
          ))}
        </Row>
      </Demo>

      <Demo name="DropdownMenu · MenuButton" tokens="role=menu · roving tabindex · type-ahead · danger tone">
        <Note>
          Arrow keys move, Home/End jump, and typing a letter seeks — separators, group labels and disabled entries are
          skipped by all three. No submenus: nothing in the board needs one, and a submenu is a second layer with its
          own hover-intent problem.
        </Note>
        <Row label="menu">
          <DropdownMenu
            items={MENU_ITEMS}
            aria-label="Deal actions"
            trigger={(props) => (
              <Button {...props} variant="ghost" size="sm">
                Actions
              </Button>
            )}
          />
          <MenuButton items={MENU_ITEMS} label="Row actions" />
        </Row>
      </Demo>

      <Demo name="ContextMenu" tokens="point anchor · same MenuList · no touch long-press">
        <Note>
          Right-click a card. The menu is anchored to a 0×0 fixed span planted at the pointer, not to a virtual-anchor
          overload of <code className="font-mono text-micro">useAnchoredPosition</code>— every popover in the system
          runs through that hook, so it keeps its one contract and flip/shift/size work here unchanged. Right-click near
          the bottom-right corner to watch it flip. Long-press on touch deliberately does nothing: 180ms is already the
          drag threshold.
        </Note>
        <Row label="cards">
          {['Acme Corp', 'Globex', 'Initech'].map((name) => (
            <ContextMenu key={name} items={MENU_ITEMS} aria-label={`${name} actions`}>
              {({ onContextMenu }) => (
                <div
                  onContextMenu={onContextMenu}
                  className="w-40 cursor-default rounded-card border border-border bg-surface px-3 py-2 text-sm"
                >
                  {name}
                  <span className="mt-0.5 block text-xs text-text-faint">right-click me</span>
                </div>
              )}
            </ContextMenu>
          ))}
        </Row>
      </Demo>

      <Demo name="useHotkeys" tokens="one window listener · lib/hotkeys.ts · scope=not-typing">
        <Note>
          One listener for a whole module, and three bail rules that are the whole design: it stands down inside a
          typing target unless the binding says <code className="font-mono text-micro">always</code>; it stands down
          when focus leaves the module root, which is what makes it embed-safe AND what silences it while a dialog or
          the palette holds focus; and a held modifier never cancels a half-typed sequence. Try <b>g</b> then <b>b</b>,
          then the same inside the popover input above — nothing fires there.
        </Note>
        <Row label="bindings">
          <Kbd keys={['mod', 'k']} />
          <span className="text-xs text-text-muted">palette (always)</span>
          <Kbd keys={['g']} />
          <Kbd keys={['b']} />
          <span className="text-xs text-text-muted">sequence</span>
          <Kbd keys={['?']} />
          <span className="text-xs text-text-muted">help</span>
          {fired ? <span className="text-xs text-accent">Fired: {fired}</span> : null}
        </Row>
      </Demo>

      <Demo name="Tooltip" tokens="surface-inverse · text-inverse · --transition-delay-tooltip">
        <Note>
          400ms to open, instant to close, and a shared grace window so moving along a toolbar does not re-wait. Touch
          never opens one — there is no hover, and a long-press tip would fight the browser&apos;s context menu. The
          control&apos;s accessible name carries the meaning there.
        </Note>
        <Row label="toolbar">
          {[
            { label: 'Board view', icon: <IconKanban size={16} /> },
            { label: 'Table view', icon: <IconLayoutList size={16} /> },
            { label: 'Undo last move', icon: <IconUndo size={16} /> },
            { label: 'Export to CSV', icon: <IconDownload size={16} /> },
          ].map((item) => (
            <Tooltip key={item.label} label={item.label}>
              <button
                type="button"
                aria-label={item.label}
                className="flex aspect-square h-field items-center justify-center rounded-control border border-border text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
              >
                {item.icon}
              </button>
            </Tooltip>
          ))}
        </Row>
        <Row label="placement">
          <Tooltip label="Above" placement="top">
            <Button variant="ghost" size="sm">
              top
            </Button>
          </Tooltip>
          <Tooltip label="To the right" placement="right">
            <Button variant="ghost" size="sm">
              right
            </Button>
          </Tooltip>
          <Tooltip label="Below, and long enough to wrap onto a second line" placement="bottom">
            <Button variant="ghost" size="sm">
              bottom
            </Button>
          </Tooltip>
        </Row>
      </Demo>

      <Demo name="Layering" tokens="z-overlay < z-popover < z-toast < z-tooltip">
        <Note>
          The ladder is one ordered set of tokens so no component invents a magic number. This is the case that proves
          it: a menu opened inside a modal has to escape the modal&apos;s stacking context, and Escape must close the
          menu first and the dialog second.
          <br />
          <br />
          Tab to the button and press Enter: the caret must land in the field without a click. The panel is portalled
          and presence-mounted, so it exists two commits after <code className="font-mono text-micro">open</code> flips
          — the focus trap arms on the panel&apos;s arrival, not on the flag, or the first field of every dialog and
          palette opened from the keyboard would never receive focus.
        </Note>
        <Row>
          <Button variant="ghost" onClick={() => setDialogOpen(true)}>
            Open a dialog with a menu inside
          </Button>
        </Row>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Nested layers"
          initialFocusRef={dialogFieldRef}
          footer={<Button onClick={() => setDialogOpen(false)}>Done</Button>}
        >
          <p className="mb-3 text-sm text-text-muted">
            Open the menu, then press Escape twice — the first closes the menu, the second closes this dialog.
          </p>
          <Input ref={dialogFieldRef} placeholder="Focused on open, from the keyboard too" className="mb-3" />
          <Row>
            <DropdownMenu
              items={MENU_ITEMS}
              aria-label="Nested menu"
              trigger={(props) => (
                <Button {...props} variant="ghost" size="sm">
                  Menu inside a dialog
                </Button>
              )}
            />
            <Tooltip label="Tooltips sit above everything">
              <Button variant="ghost" size="sm">
                Hover me
              </Button>
            </Tooltip>
          </Row>
        </Dialog>
      </Demo>

      <Demo name="Command palette" tokens="Overlay + scrim · lib/filter.ts · aria-activedescendant">
        <Row>
          <Button variant="ghost" onClick={() => setPaletteOpen(true)}>
            Open palette
          </Button>
          <Kbd keys={['mod', 'k']} />
          {ran ? <span className="text-xs text-text-muted">Ran: {ran}</span> : null}
        </Row>
        <Note>
          Matching is subsequence-with-scoring: an exact prefix always wins, ties break toward the shorter label, and a
          hit on a hidden keyword ranks below a hit on the label itself. Try <b>mtw</b>, or <b>money</b> (a keyword of
          &ldquo;Set amount&rdquo;). Open it with ⌘K and type straight away — the input is focused on the commit the
          panel arrives, not on the one before it.
          <br />
          <br />
          With a query the list is flat and ranked by score — rows compete, not groups — and each row carries its
          group&rsquo;s label at the right edge so you still know what kind of thing it is. Type <b>sho</b>: &ldquo;Show
          details&rdquo; (a label prefix) leads, &ldquo;Keyboard shortcuts&rdquo; from another group comes second, and
          &ldquo;Assign to me&rdquo; — s…h…o scattered through its description — sits last instead of riding second on
          the strength of its group. With no query, the groups render in the author&rsquo;s order under their headings.
          Descriptions count at half weight — <b>attr</b> still finds &ldquo;Set amount&rdquo; through its description,
          but prose that happens to contain the letters can no longer outrank a label that starts with them.
        </Note>
        <Command
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          footer={
            <>
              <span className="flex items-center gap-1">
                <Kbd keys={['up']} />
                <Kbd keys={['down']} /> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd keys={['enter']} /> run
              </span>
              <span className="flex items-center gap-1">
                <Kbd keys={['esc']} /> close
              </span>
            </>
          }
          groups={[
            {
              id: 'stage',
              label: 'Move to stage',
              items: [
                {
                  id: 'won',
                  label: 'Move to Won',
                  keywords: ['close', 'stage'],
                  shortcut: ['5'],
                  icon: <IconCheck size={14} />,
                  onSelect: () => setRan('Move to Won'),
                },
                {
                  id: 'lost',
                  label: 'Move to Lost',
                  keywords: ['close', 'stage'],
                  shortcut: ['6'],
                  onSelect: () => setRan('Move to Lost'),
                },
                {
                  id: 'ready',
                  label: 'Move to Ready',
                  keywords: ['stage'],
                  shortcut: ['3'],
                  onSelect: () => setRan('Move to Ready'),
                },
              ],
            },
            {
              id: 'deal',
              label: 'This deal',
              items: [
                {
                  id: 'amount',
                  label: 'Set amount',
                  description: 'Writes the deal amount attribute',
                  keywords: ['money', 'value', 'price'],
                  onSelect: () => setRan('Set amount'),
                },
                {
                  id: 'date',
                  label: 'Set close date',
                  keywords: ['when', 'deadline'],
                  onSelect: () => setRan('Set close date'),
                },
                {
                  id: 'assign',
                  label: 'Assign to me',
                  description: 'Hands the deal to whoever is signed in',
                  keywords: ['owner'],
                  onSelect: () => setRan('Assign to me'),
                },
                {
                  id: 'details',
                  label: 'Show details',
                  description: 'Owner, amount and every attribute in the side panel',
                  keywords: ['panel'],
                  onSelect: () => setRan('Show details'),
                },
                {
                  id: 'disabled',
                  label: 'Delete deal',
                  description: 'Not offered — the API has no way to un-make a deal',
                  disabled: true,
                  onSelect: () => {},
                },
              ],
            },
            {
              id: 'view',
              label: 'Go to',
              items: [
                { id: 'board', label: 'Board', icon: <IconKanban size={14} />, onSelect: () => setRan('Board') },
                { id: 'table', label: 'Table', icon: <IconLayoutList size={14} />, onSelect: () => setRan('Table') },
                {
                  id: 'shortcuts',
                  label: 'Keyboard shortcuts',
                  keywords: ['keys', 'help'],
                  onSelect: () => setRan('Keyboard shortcuts'),
                },
              ],
            },
          ]}
        />
      </Demo>
    </div>
  );
}
