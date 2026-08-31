import { useRef, useState } from 'react';
import { Alert, Button, Checkbox, CopyField, Dialog, FormField, Input, Label, RadioGroup, Select, useToast } from '~ui';
import type { AssignableRole } from '../../types';
import { useTeam } from '../TeamContext';
import { messageForError } from '../../lib/copy';
import { validateInviteEmail } from '../../lib/validation';

export interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { value: '24', label: '1 day' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
];

const ROLE_OPTIONS = [
  {
    value: 'member' as const,
    label: 'Member',
    description: 'Uses the workspace. Cannot invite people or change the team.',
  },
  {
    value: 'admin' as const,
    label: 'Admin',
    description: 'Everything a member can do, plus inviting people and managing their roles.',
  },
];

/**
 * Create an invite link.
 *
 * The raw token exists exactly once — the server keeps only its hash — so the
 * dialog does not close on success: it becomes the place the link is read
 * from, and every link made in this session stays listed underneath. The same
 * URLs go into the store, which is what lets a row's "Copy invite link" work
 * for the ones created here and stay disabled for the rest.
 */
export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const team = useTeam();
  const toast = useToast();

  const [role, setRole] = useState<AssignableRole>('member');
  const [email, setEmail] = useState('');
  const [expiry, setExpiry] = useState('168');
  /** Row ids of the bots a member arrives with. An admin reaches all of them anyway. */
  const [bots, setBots] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Newest first — the links created since this dialog was first opened. */
  const [created, setCreated] = useState<{ id: string; url: string; label: string }[]>([]);

  /* The role is the first decision, so it takes the focus — but the dialog's
   * first tabbable is its Close button, so it has to be asked for by hand. The
   * callback ref resolves the radio input the moment the group mounts, before
   * the focus trap arms. */
  const roleRef = useRef<HTMLElement | null>(null);
  const attachRole = (node: HTMLDivElement | null) => {
    roleRef.current = node?.querySelector('input') ?? null;
  };

  const close = () => {
    setCreated([]);
    setError(null);
    setEmailError(null);
    onClose();
  };

  /* Fired by the form's own submit AND by the footer button, which lives
   * outside the <form> — hence the structural event type. */
  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const invalid = validateInviteEmail(email);
    setEmailError(invalid);
    if (invalid) return;
    setBusy(true);
    setError(null);
    try {
      const { invite, url } = await team.createInvite({
        role,
        email: email.trim().toLowerCase() || null,
        expiresInHours: Number(expiry),
        bots: role === 'admin' ? [] : bots,
      });
      setCreated((prev) => [
        { id: invite.id, url, label: `${invite.email ?? 'Anyone with the link'} · ${invite.role}` },
        ...prev,
      ]);
      setEmail('');
      toast.show({
        tone: 'success',
        title: 'Invite link created',
        description: 'Copy it now — it is shown only once.',
      });
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  };

  const latest = created[0] ?? null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Invite people"
      size="md"
      initialFocusRef={roleRef}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close} disabled={busy}>
            {created.length > 0 ? 'Done' : 'Cancel'}
          </Button>
          <Button variant="primary" size="sm" loading={busy} onClick={(event) => void submit(event)}>
            {created.length > 0 ? 'Create another' : 'Create link'}
          </Button>
        </>
      }
    >
      {/* The footer's button submits it; Enter in a field does too. */}
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <div ref={attachRole}>
          <RadioGroup<AssignableRole> legend="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </div>

        {/* The wording is deliberate: the address narrows who can accept, and the
            server does check it — but on a deployment with email confirmation off
            (the wizard's default), registering an address needs no access to the
            mailbox. So the address is addressing, and the token is the secret. */}
        <FormField
          label="Email address"
          hint="Only an account using this address can accept the link — the token in the link is what keeps it private."
          error={emailError}
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              autoComplete="off"
              placeholder="teammate@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(null);
              }}
            />
          )}
        </FormField>

        {/* An admin administers the workspace and reaches every bot in it, so
            there is nothing to pick for them. */}
        {role === 'member' && team.state.bots.length > 0 ? (
          <div className="flex flex-col gap-1">
            <Label>Bots</Label>
            <ul className="flex flex-col gap-1">
              {team.state.bots.map((bot) => (
                <li key={bot.id}>
                  <Checkbox
                    checked={bots.includes(bot.id)}
                    label={bot.name}
                    onChange={(next) =>
                      setBots((prev) => (next ? [...prev, bot.id] : prev.filter((id) => id !== bot.id)))
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Not a FormField: `Select` takes no id, so nothing can be labelled
            at it — the name has to come from `aria-label`. */}
        <div className="flex flex-col gap-1">
          <Label>Link expires</Label>
          <Select
            aria-label="Link expires"
            value={expiry}
            onChange={setExpiry}
            options={EXPIRY_OPTIONS}
            className="w-full"
          />
        </div>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {latest ? (
          <div className="rounded-card border border-border bg-surface-sunken p-3">
            <CopyField label="Invite link" value={latest.url} mono size="sm" />
          </div>
        ) : null}

        {created.length > 1 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-text-muted">Links created in this session</span>
            {created.slice(1).map((item) => (
              <CopyField key={item.id} aria-label={`Invite link for ${item.label}`} value={item.url} mono size="sm" />
            ))}
          </div>
        ) : null}

        {/* A submit button is what makes Enter submit the form; the visible
            one lives in the dialog's footer, outside this <form>. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
