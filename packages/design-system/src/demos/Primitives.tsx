import { useState, type ReactNode } from 'react';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Kbd, Progress, Separator, Skeleton, Spinner, Tag } from '~ui';
import * as Icons from '~ui/icons';
import { Demo, Note, Row } from './shared';

const ICON_ENTRIES = Object.entries(Icons)
  .filter(([name]) => name.startsWith('Icon'))
  .sort(([a], [b]) => a.localeCompare(b)) as [string, (p: { size?: number }) => ReactNode][];

/* Utilities are spelled out in full so Tailwind's scanner sees each one —
   a template like `text-channel-${id}` would emit nothing. */
const CHANNELS = [
  { name: 'Instagram', Icon: Icons.IconInstagram, glyph: 'text-channel-instagram', soft: 'bg-channel-instagram-soft' },
  { name: 'WhatsApp', Icon: Icons.IconWhatsApp, glyph: 'text-channel-whatsapp', soft: 'bg-channel-whatsapp-soft' },
  { name: 'Facebook', Icon: Icons.IconFacebook, glyph: 'text-channel-facebook', soft: 'bg-channel-facebook-soft' },
  { name: 'TikTok', Icon: Icons.IconTikTok, glyph: 'text-channel-tiktok', soft: 'bg-channel-tiktok-soft' },
  { name: 'Widget', Icon: Icons.IconWidget, glyph: 'text-channel-widget', soft: 'bg-channel-widget-soft' },
];

export function PrimitivesSection() {
  const [progress, setProgress] = useState(35);

  return (
    <div className="space-y-4">
      <Demo name="Button" tokens="bg-accent · translucent secondary · ghost hover-only · radius-pill · field heights">
        <Note>
          The rule is emphasis, not decoration: one <code>primary</code> per surface, <code>danger</code> only where
          something is destroyed, and everything else quiet. <code>ghost</code> is where most buttons in the product
          live — header actions, row actions, "+ Add" — and it draws nothing until hovered. <code>secondary</code> is a
          real action beside a primary one. <code>outline</code> is the old ghost, for the rare busy background. Icons
          take their size from the button.
        </Note>
        <Row label="primary">
          <Button>Save changes</Button>
          <Button size="sm">Small</Button>
          <Button size="xs">Extra small</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </Row>
        <Row label="secondary">
          <Button variant="secondary">Cancel</Button>
          <Button variant="secondary" size="sm">
            Retry
          </Button>
          <Button variant="secondary" size="xs">
            Load older
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost">Refresh</Button>
          <Button variant="ghost" size="sm">
            <Icons.IconPlus />
            Add row
          </Button>
          <Button variant="ghost" size="xs">
            Edit
          </Button>
          <Button variant="ghost" aria-pressed>
            Pressed
          </Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="outline">
          <Button variant="outline">Filters</Button>
          <Button variant="outline" size="sm">
            Views
          </Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="danger">
          <Button variant="danger">Delete bot</Button>
          <Button variant="danger" size="sm">
            Delete
          </Button>
          <Button variant="dangerGhost" size="sm">
            <Icons.IconTrash />
            Remove
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="icon only">
          <Button iconOnly aria-label="Refresh">
            <Icons.IconRefresh />
          </Button>
          <Button iconOnly variant="secondary" aria-label="Refresh">
            <Icons.IconRefresh />
          </Button>
          <Button iconOnly variant="ghost" aria-label="More">
            <Icons.IconMore />
          </Button>
          <Button iconOnly variant="ghost" size="sm" aria-label="Close">
            <Icons.IconClose />
          </Button>
          <Button iconOnly variant="ghost" size="xs" aria-label="Close">
            <Icons.IconClose />
          </Button>
          <Button iconOnly variant="dangerGhost" size="sm" aria-label="Delete">
            <Icons.IconTrash />
          </Button>
          <Button iconOnly variant="ghost" loading aria-label="Refreshing">
            <Icons.IconRefresh />
          </Button>
        </Row>
        <Row label="beside a field">
          <input
            className="h-field rounded-control border border-border bg-surface px-3 text-sm text-text"
            placeholder="Same height, same radius"
            readOnly
          />
          <Button variant="secondary">Apply</Button>
          <Button>Save</Button>
        </Row>
      </Demo>

      <Demo name="Avatar · Badge · Spinner · Tag" tokens="oklch(--avatar-*) ramp · bg-accent · status softs">
        <Row label="Avatar">
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" size={28} />
          <Avatar name="Alan Turing" size={48} />
          <Avatar name="Broken Src" src="https://invalid.example/x.png" />
        </Row>
        <Row label="square">
          <Avatar name="Northwind Coffee" shape="square" />
          <Avatar name="Harbour Books" shape="square" size={48} />
          <span className="text-xs text-text-faint">an account wears the square, a person wears the circle</span>
        </Row>
        <Row label="Badge">
          <Badge count={3} />
          <Badge count={42} />
          <Badge count={128} />
          <span className="text-xs text-text-faint">count 0 renders nothing</span>
        </Row>
        <Row label="Spinner">
          <Spinner />
          <Spinner size={24} />
        </Row>
        <Row label="Tag">
          <Tag>neutral</Tag>
          <Tag tone="accent">accent</Tag>
          <Tag tone="success">success</Tag>
          <Tag tone="warning">warning</Tag>
          <Tag tone="danger">danger</Tag>
        </Row>
      </Demo>

      <Demo name="Card" tokens="rounded-card · border-border · shadow-card-inset · surface-sunken footer">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            title="Pipeline value"
            description="Loaded rows only"
            actions={<Tag tone="accent">Q3</Tag>}
            footer={<span className="text-xs text-text-muted">12 of 21 deals loaded</span>}
          >
            <p className="text-2xl font-semibold tabular-nums text-text">€96,400</p>
          </Card>
          <Card elevated title="Elevated">
            <p className="text-sm text-text-muted">
              Header and footer only render when something fills them, so a bare card is one box with no stray dividers.
            </p>
          </Card>
        </div>
      </Demo>

      <Demo name="Separator · Kbd" tokens="bg-border · translucent key caps">
        <Row label="horizontal">
          <div className="w-full max-w-md">
            <Separator />
          </div>
        </Row>
        <Row label="labelled">
          <div className="w-full max-w-md">
            <Separator label="or" />
          </div>
        </Row>
        <Row label="vertical">
          <span className="flex h-6 items-center gap-3 text-sm text-text-muted">
            Board
            <Separator orientation="vertical" />
            Table
            <Separator orientation="vertical" />
            Forecast
          </span>
        </Row>
        <Row label="Kbd">
          <Kbd keys={['mod', 'k']} />
          <Kbd keys={['shift', 'mod', 'p']} />
          <Kbd keys={['esc']} />
          <Kbd keys={['up']} />
          <span className="text-xs text-text-faint">`mod` renders ⌘ on Apple platforms, Ctrl elsewhere</span>
        </Row>
      </Demo>

      <Demo name="Progress" tokens="animate-progress · bg-accent · surface-sunken track">
        <div className="max-w-md space-y-4">
          <Progress value={progress} label="Export progress" showLabel />
          <Row>
            <Button size="sm" variant="ghost" onClick={() => setProgress((v) => Math.max(0, v - 20))}>
              −20
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setProgress((v) => Math.min(100, v + 20))}>
              +20
            </Button>
          </Row>
          <Progress label="Loading contacts" size="sm" />
          <Row label="tones">
            <div className="flex-1 space-y-2">
              <Progress value={80} label="Success" tone="success" />
              <Progress value={95} label="Almost at the limit" tone="warning" />
              <Progress value={100} label="Over quota" tone="danger" />
            </div>
          </Row>
        </div>
      </Demo>

      <Demo name="Skeleton" tokens="@utility skeleton · animate-shimmer">
        <Note>
          Both the gradient and the sweep are tokens, so reduced motion turns the animation off in the stylesheet — the
          component has no branch for it.
        </Note>
        <div className="flex max-w-md items-start gap-3">
          <Skeleton variant="circle" height="2.5rem" />
          <div className="min-w-0 flex-1">
            <Skeleton variant="text" lines={3} />
          </div>
        </div>
        <div className="mt-3 max-w-md">
          <Skeleton variant="block" height="4rem" />
        </div>
      </Demo>

      <Demo name="Alert" tokens="info / success / warning / danger softs · role=alert on the loud two">
        <div className="max-w-2xl space-y-2">
          <Alert tone="info" title="Saved views are per user">
            The API only offers per-user storage, so a view you save here is not visible to your teammates.
          </Alert>
          <Alert tone="success" title="Deal moved to Won" />
          <Alert tone="warning" title="Money totals cover loaded rows only">
            There is no aggregation endpoint — 12 of 21 deals in this column have been loaded.
          </Alert>
          <Alert
            tone="danger"
            title="Could not update the stage"
            action={
              <Button size="sm" variant="ghost">
                Retry
              </Button>
            }
            onDismiss={() => {}}
          >
            The server rejected the change.
          </Alert>
        </div>
      </Demo>

      <Demo name="EmptyState" tokens="text-faint icon · text-muted description">
        <EmptyState
          icon={<Icons.IconInbox size={28} />}
          title="No conversations yet"
          description="New messages from connected channels land here."
          action={<Button size="sm">Connect a channel</Button>}
        />
      </Demo>

      <Demo name="Icons" tokens="currentColor · size prop (default 16)">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
          {ICON_ENTRIES.map(([name, Icon]) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-3 text-text-muted"
            >
              <Icon size={20} />
              <span className="truncate font-mono text-nano text-text-faint">{name}</span>
            </div>
          ))}
        </div>
      </Demo>

      <Demo name="Channel glyphs" tokens="text-channel-* glyph · bg-channel-*-soft circle · ≥ 3:1 in both themes">
        <Note>
          The five platform glyphs on the same stroke grammar as every other icon, each on its own tinted circle — the
          channel badge on an automation card, the platform cell in a table. Outlines, not the brands&apos; filled
          marks: a row of five reads as one set, and the colour is a token pair, so a rebrand retunes it in one place.
          At 16 px the glyph alone is enough; the circle is for 24 and up.
        </Note>
        <Row label="24 px">
          {CHANNELS.map(({ name, Icon, glyph, soft }) => (
            <span key={name} className="inline-flex items-center gap-2 text-sm text-text-muted">
              <span className={`inline-flex size-8 items-center justify-center rounded-full ${soft} ${glyph}`}>
                <Icon size={18} />
              </span>
              {name}
            </span>
          ))}
        </Row>
        <Row label="16 px">
          {CHANNELS.map(({ name, Icon, glyph }) => (
            <span key={name} className={`inline-flex items-center gap-1.5 text-xs ${glyph}`}>
              <Icon size={16} />
              {name}
            </span>
          ))}
        </Row>
      </Demo>
    </div>
  );
}
