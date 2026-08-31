# Customizing this module

Follow `../chatfuel-core/playbooks/customize.md` first. Module-specific knobs:

- **What a new account gets**: an empty bot (`workspaceCreateBot`) in
  `vendor/chatfuel-proxy/botRoutes.ts`, `createBotInWorkspace`. `copyBot(botID:)` clones a
  template bot instead — but it takes no workspace, so a clone lands outside the one the plan is
  paid on; pair it with `workspaceTransferBot(botID:, targetWorkspaceID:)` if you go that way.
- **Where the bots are billed**: `CHATFUEL_WORKSPACE_ID`, picked by the wizard from
  `currentUser { workspaces }`. Moving a deployment to another workspace is an env change plus a
  `workspaceTransferBot` per existing bot; the bot limit is a Chatfuel plan setting, not ours.
- **Roles**: `owner | admin | member` are checks in the migration and a map in
  `lib/roles.ts`. Adding a role = migration `0002_…` widening the check +
  `assignableRoles()` + the RPC guards (`cf_require_admin`).
- **Invite expiry choices**: `team/components/InviteDialog.tsx`; the RPC caps at 30 days.
- **Password rules**: Supabase Auth → Providers → Email (min length, HIBP); the UI reads
  `WeakPassword` from the API and shows the strength meter for guidance only.
- **Email delivery** (reset password): Supabase Auth → SMTP; until configured, admins use
  *Reset password link* on the Team row menu (needs `SUPABASE_SERVICE_ROLE_KEY` **and**
  `AUTH_RECOVERY_LINK_LOG` on the server — off by default, so a stock install answers 501 there).
  Own SMTP also unlocks the recovery **template** — free projects on Supabase's default provider
  refuse template edits (`400`), so their reset mail keeps the default same-browser PKCE link.
- **OAuth providers / magic link**: not wired; `adapters/supabaseAdapter.ts` is where a
  `signInWithOAuth` would go, and the sign-in screen has a footer slot for provider buttons.
- **Look**: everything is `~ui` — `AuthLayout`, `PasswordInput`, `FormField`, `UserMenu`,
  `CopyField`, `DataCards`; tokens in `src/vendor/ui/styles/tokens.css`.

## Restricting who may sign up

There is no switch for this. Sign-up is open by design (`references/guide.md`) — and here it also
costs a Chatfuel bot, and so does every extra bot an account creates afterwards, so a restriction
is a reasonable thing to want.

It goes in a **new migration** and in **one** function: the server refuses to create a bot for
anybody `cf_claim_workspace` will not open a workspace for, so a check there is a check everywhere.

```sql
-- supabase/migrations/0002_signup_domains.sql
create or replace function public.cf_claim_workspace(p_name text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_tenant uuid; v_name text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;

  -- Somebody already inside — including an invited colleague — is never
  -- re-checked: the invite is the decision, and re-checking would lock out
  -- the very people the owner asked for.
  select m.tenant_id into v_tenant from public.cf_members m where m.user_id = auth.uid() limit 1;
  if v_tenant is not null then
    return public.cf_my_workspace();
  end if;

  -- The new bit, and it runs only for a brand-new account.
  if split_part(public.cf_auth_email(), '@', 2) <> all (array['acme.io', 'acme.com']) then
    raise sqlstate 'PT403' using message = 'Sign-ups are limited to a company address', hint = 'bad_domain';
  end if;

  -- …the rest of the body, unchanged from 0001.
end $$;
revoke execute on function public.cf_claim_workspace(text) from public, anon, authenticated;
grant execute on function public.cf_claim_workspace(text) to authenticated;
insert into public.cf_migrations (name) values ('0002_signup_domains') on conflict (name) do nothing;
notify pgrst, 'reload schema';
```

Then, in order:

1. **Never edit `0001`** — copy the function body into `0002` and `create or replace` it there. One
   agency project serves many deployments, each re-applying the `0001` it shipped with.
2. Keep the revoke-then-grant pair. Supabase default-grants `execute` to `anon` on every new
   `public` function, and `create or replace` is a new function as far as that is concerned.
3. Map the new hint: add `bad_domain` to `HINT_CODES` in `adapters/errors.ts`, the code to
   `AuthErrorCode` in `types.ts`, and a sentence to `lib/copy.ts` — the copy table is a
   `Record<AuthErrorCode, string>`, so a missing sentence is a type error rather than a screen that
   prints the code at somebody.
4. Decide what the **sign-up screen** should say before the failure happens. The refusal arrives
   after GoTrue has already created the account, so a rejected stranger ends up signed in with no
   workspace; `/no-access` is where they land, and its copy assumes a transient failure.
5. Do **not** re-check people who are already members — an invited colleague would be locked out of
   the workspace they were invited to.
6. Dry-run it before it touches a real project: `content/modules/auth/supabase/test/run.sh`, in
   the chatfuel-wizard repository (not in your app — the harness is not part of the scaffold),
   applies the migrations to a throwaway Postgres and runs every RPC as PostgREST would. Add your
   case to `test/scenario.sql`.

An allowlist is not authentication: addresses are unverified while `mailer_autoconfirm` is on
(`references/security.md`). It filters honest mistakes — the wrong Google account, a personal
address — not somebody who wants in. What it does buy on this design is real, though: no bot is
created for a rejected sign-up.
