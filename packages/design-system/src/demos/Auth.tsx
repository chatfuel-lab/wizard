import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  AuthLayout,
  Avatar,
  Button,
  Card,
  Checkbox,
  CopyField,
  DataCards,
  DataTable,
  FormField,
  IconBolt,
  IconLogOut,
  IconMail,
  IconShield,
  IconUsers,
  Input,
  MenuButton,
  PasswordInput,
  Tag,
  Textarea,
  ThemeToggle,
  UserMenu,
  type DataTableColumn,
  type MenuItem,
} from '~ui';
import { ResizableBox } from './Layout';
import { Demo, Note, Row } from './shared';

/* ── sample props ──────────────────────────────────────────────────────── */

const Brand = () => (
  <span className="flex items-center gap-2 text-sm font-semibold text-text">
    <span className="flex size-7 items-center justify-center rounded-control bg-accent text-accent-fg">
      <IconBolt size={16} />
    </span>
    Chatfuel
  </span>
);

const USER_MENU_ITEMS: readonly MenuItem[] = [
  { id: 'account', label: 'Account settings', icon: <IconShield />, onSelect: () => {} },
  { id: 'team', label: 'Team', icon: <IconUsers />, onSelect: () => {} },
  { kind: 'separator', id: 's' },
  { id: 'signout', label: 'Sign out', icon: <IconLogOut />, tone: 'danger', onSelect: () => {} },
];

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  lastActive: string;
  warning?: string;
}

const MEMBERS: Member[] = [
  { id: 'm1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Owner', lastActive: 'Just now' },
  {
    id: 'm2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'Admin',
    lastActive: '2 h ago',
    warning: 'Owns 3 automations',
  },
  { id: 'm3', name: 'Alan Turing', email: 'alan@example.com', role: 'Editor', lastActive: 'Yesterday' },
  { id: 'm4', name: 'Katherine Johnson', email: 'kj@example.com', role: 'Viewer', lastActive: '3 d ago' },
];

const ROLE_TONE: Record<Member['role'], 'accent' | 'success' | 'neutral' | 'warning'> = {
  Owner: 'accent',
  Admin: 'success',
  Editor: 'neutral',
  Viewer: 'neutral',
};

/* One column set, rendered twice — that equality is what the demo shows. */
const MEMBER_COLUMNS: DataTableColumn<Member>[] = [
  {
    key: 'member',
    header: 'Member',
    render: (m) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={m.name} size={28} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-text">{m.name}</span>
          <span className="block truncate text-xs text-text-muted">{m.email}</span>
        </span>
      </span>
    ),
  },
  { key: 'role', header: 'Role', width: '6rem', render: (m) => <Tag tone={ROLE_TONE[m.role]}>{m.role}</Tag> },
  { key: 'lastActive', header: 'Last active', width: '7rem', align: 'end' },
  {
    key: 'warning',
    header: 'Warnings',
    width: '10rem',
    render: (m) => (m.warning ? <span className="text-xs text-warning">{m.warning}</span> : null),
  },
  {
    key: 'actions',
    header: '',
    width: '3rem',
    render: () => (
      <MenuButton
        label="Member actions"
        items={[
          { id: 'role', label: 'Change role', onSelect: () => {} },
          { id: 'remove', label: 'Remove', tone: 'danger', onSelect: () => {} },
        ]}
      />
    ),
  },
];

/* ── the sign-in composition ──────────────────────────────────────────── */

function SignInForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailError = submitted && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address' : null;
  const passwordError = submitted && password.length === 0 ? 'Enter your password' : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length === 0) return;
    setBusy(true);
    /* This gallery has no server; every attempt is refused, which is the state
       worth looking at anyway. */
    window.setTimeout(() => {
      setBusy(false);
      setServerError('That email and password do not match. Try again, or reset your password.');
    }, 600);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError ? (
        <Alert tone="danger" onDismiss={() => setServerError(null)}>
          {serverError}
        </Alert>
      ) : null}
      <FormField label="Email" error={emailError} required>
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </FormField>
      <FormField label="Password" error={passwordError} required>
        {(a11y) => (
          <PasswordInput
            {...a11y}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox label="Keep me signed in" checked={remember} onChange={setRemember} />
        <a href="#reset" className="text-xs font-medium text-accent hover:underline focus-visible:focus-ring">
          Forgot password?
        </a>
      </div>
      <Button type="submit" loading={busy} className="w-full">
        Sign in
      </Button>
      {compact ? null : (
        <p className="text-center text-xs text-text-muted">
          By continuing you agree to the Terms and the Privacy Policy.
        </p>
      )}
    </form>
  );
}

function SignInPage({ width, fill = false }: { width?: 'sm' | 'md'; fill?: boolean }) {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Use the email you signed up with."
      brand={<Brand />}
      topRight={<ThemeToggle />}
      width={width}
      fill={fill}
      footer={
        <>
          <span>
            New here?{' '}
            <a href="#signup" className="font-medium text-accent hover:underline focus-visible:focus-ring">
              Create an account
            </a>
          </span>
          <span aria-hidden>·</span>
          <a href="#status" className="hover:underline focus-visible:focus-ring">
            Status
          </a>
        </>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}

/** A fixed-width viewport for one AuthLayout: the number is the container width, not the window. */
function Frame({ width, height = 560, children }: { width: number; height?: number; children: ReactNode }) {
  return (
    <div className="max-w-full shrink-0">
      <div className="mb-1 font-mono text-micro text-text-faint tabular-nums">container {width}px</div>
      <div
        style={{ width, height }}
        className="max-w-full overflow-hidden rounded-card border border-border bg-surface"
      >
        {children}
      </div>
    </div>
  );
}

/* ── the section ──────────────────────────────────────────────────────── */

export function AuthSection() {
  const [newPassword, setNewPassword] = useState('');
  const [bio, setBio] = useState('');
  const [copies, setCopies] = useState(0);
  const [showFieldErrors, setShowFieldErrors] = useState(true);

  return (
    <div className="space-y-4">
      <Demo name="AuthLayout" tokens="@container · ≥28rem raised card · max-w-auth / max-w-auth-wide · h-dvh or h-full">
        <Note>
          The centred column every unauthenticated page is built on. It is its own container: from 28rem of container
          width up the column sits in a raised card; below that it goes flat and the page gutter is the only inset — the
          same component at 360px, at 480px and at 720px, and it never asks the window. The fourth box is the rig from
          Layout: drag it across 448px and watch the card appear.
        </Note>
        <div className="flex flex-wrap gap-4 overflow-x-auto pb-2">
          <Frame width={360}>
            <SignInPage />
          </Frame>
          <Frame width={480}>
            <SignInPage />
          </Frame>
          <Frame width={720}>
            <SignInPage width="md" />
          </Frame>
        </div>
        <div className="mt-4">
          <ResizableBox height={600}>
            <SignInPage />
          </ResizableBox>
        </div>
      </Demo>

      <Demo name="Sign in" tokens="FormField · Input · PasswordInput · Button · Alert danger">
        <Note>
          The full composition on its own, without the layout: FormField mints the id and the ARIA plumbing, Input
          paints the danger border from the <code>aria-invalid</code> it is handed, and the Alert carries the server's
          answer. Submit it empty for the field errors; submit anything valid for the server error.
        </Note>
        <div className="max-w-auth">
          <SignInForm />
        </div>
      </Demo>

      <Demo name="PasswordInput" tokens="show/hide button · aria-pressed · strength meter · aria-live">
        <Note>
          The toggle is a real button in the trailing slot: focusable, labelled "Show password" / "Hide password",{' '}
          <code>aria-pressed</code>, and the value survives the flip. With <code>showStrength</code> four segments and a
          word follow lib/password's score — type <code>sunflower1</code>, then capitalise it, then add a symbol.
        </Note>
        <div className="grid max-w-lg gap-4">
          <FormField label="Current password">
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" defaultValue="hunter2" />}
          </FormField>
          <FormField label="New password" hint="At least 8 characters. Longer beats cleverer." required>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="new-password"
                showStrength
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </FormField>
          <div className="grid gap-2">
            <span className="text-xs text-text-muted">Weak → strong, at rest</span>
            {['abc', 'sunflower1', 'Sunflower1', 'Sunflower1!x'].map((sample) => (
              <PasswordInput
                key={sample}
                aria-label={`Sample: ${sample}`}
                autoComplete="new-password"
                showStrength
                value={sample}
                readOnly
              />
            ))}
          </div>
        </div>
      </Demo>

      <Demo name="CopyField" tokens="readonly input · click selects all · IconCopy → IconCheck · sr-only live region">
        <Note>
          A value to be taken away. Click the box and the whole value is selected; the button writes it to the clipboard
          (navigator.clipboard, with the execCommand fallback for plain http) and swaps to a check for 1.5s while a
          polite live region says "Copied".
        </Note>
        <div className="grid max-w-lg gap-4">
          <CopyField
            label="Invite link"
            value="https://app.example.com/invite/9f2c1a7e-3d4b-4c8a-9e21-7b6f0d2a5c11"
            onCopied={() => setCopies((n) => n + 1)}
          />
          <CopyField label="API key" mono value="cf_live_EXAMPLEKEYEXAMPLEKEYEXAMPLEKEY" />
          <CopyField aria-label="Recovery code" mono size="sm" value="7QJ4-M2KX-9PLR-3TVB" />
          <span className="text-xs text-text-muted tabular-nums">onCopied fired {copies}×</span>
        </div>
      </Demo>

      <Demo name="FormField" tokens="Label · hint id · error id · aria-describedby · aria-invalid">
        <Note>
          Label + control + hint + error, wired together through a render prop — the field mints the id and the two ARIA
          attributes, and any control that spreads them is labelled, described and marked invalid. Input and Textarea
          paint the danger state from <code>aria-invalid</code> alone.
        </Note>
        <Row>
          <Checkbox label="Show errors" checked={showFieldErrors} onChange={setShowFieldErrors} />
        </Row>
        <div className="mt-2 grid max-w-lg gap-4">
          <FormField
            label="Workspace name"
            hint="Shown to your team and in invite emails."
            error={showFieldErrors ? 'A workspace with that name already exists' : null}
            required
          >
            {(a11y) => <Input {...a11y} defaultValue="Acme Support" />}
          </FormField>
          <FormField label="Email" error={showFieldErrors ? 'Enter a valid email address' : null}>
            {(a11y) => <Input {...a11y} type="email" defaultValue="ada@" />}
          </FormField>
          <FormField label="About" hint="Optional." error={showFieldErrors ? 'Keep it under 200 characters' : null}>
            {(a11y) => (
              <Textarea
                {...a11y}
                rows={2}
                maxLength={200}
                showCount
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            )}
          </FormField>
          <Row label="invalid prop">
            <Input invalid defaultValue="Set by hand" className="max-w-40" />
            <Input aria-invalid defaultValue="Via aria-invalid" className="max-w-40" />
          </Row>
        </div>
      </Demo>

      <Demo name="UserMenu" tokens="Avatar trigger · aria-haspopup=menu · MenuList roving · danger Sign out">
        <Note>
          DropdownMenu with a header: the identity block (name, email, workspace) above the items, on the same floating
          machinery, so arrows, type-ahead, Escape and outside-click are inherited. Sign out takes the danger tone.
        </Note>
        <div className="flex h-topbar items-center gap-2 rounded-card border border-border bg-surface-raised px-3">
          <span className="text-sm font-semibold text-text">Acme Support</span>
          <span className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              name="Ada Lovelace"
              email="ada.lovelace@example.com"
              workspace="Acme Support"
              items={USER_MENU_ITEMS}
            />
            <UserMenu
              name="Grace Hopper"
              email="grace.brewster.murray.hopper@example.com"
              avatarUrl="https://invalid.example/grace.png"
              items={USER_MENU_ITEMS}
              aria-label="Grace's account menu"
            />
          </span>
        </div>
      </Demo>

      <Demo name="Card tone=danger" tokens="border-danger/40 · text-danger title · body stays text-text">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            tone="danger"
            title="Danger zone"
            description="These cannot be undone."
            footer={
              <Button variant="danger" size="sm">
                Delete workspace
              </Button>
            }
          >
            <p className="text-sm text-text">
              Deleting the workspace removes every bot, flow, contact and team member in it. Export first.
            </p>
          </Card>
          <Card
            title="Sessions"
            description="Where you are signed in."
            actions={
              <Button variant="ghost" size="sm">
                Sign out everywhere
              </Button>
            }
          >
            <ul className="flex flex-col gap-2 text-sm text-text">
              <li className="flex items-center gap-2">
                <IconShield size={14} className="text-success" /> This device · Chrome on macOS
              </li>
              <li className="flex items-center gap-2 text-text-muted">
                <IconMail size={14} /> iPhone · signed in via magic link
              </li>
            </ul>
          </Card>
        </div>
      </Demo>

      <Demo
        name="DataCards vs DataTable"
        tokens="one DataTableColumn[] · header → cell lines · empty-header column top-right"
      >
        <Note>
          The same column set, rendered as the table (wide band) and as cards (compact band). The first column is the
          heading; the header-less menu column sits top-right; the empty Warnings cell is skipped rather than rendered
          as a blank line. Nothing about the cards is hand-written, so a column added to the table cannot go missing on
          phones.
        </Note>
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 self-start rounded-card border border-border">
            <DataTable<Member>
              columns={MEMBER_COLUMNS}
              rows={MEMBERS}
              rowKey={(m) => m.id}
              density="comfortable"
              caption="Team members"
            />
          </div>
          <DataCards<Member> columns={MEMBER_COLUMNS} rows={MEMBERS} rowKey={(m) => m.id} />
        </div>
      </Demo>
    </div>
  );
}
