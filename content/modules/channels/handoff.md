### Channels (channels)

Every channel connected to the bot, on one page: the WhatsApp number, the
Instagram account, the TikTok account, the Facebook pages and the web widget,
each with what it is connected as and a Disconnect. Route: `/channels`; there
are no views, and the only params are the two the return leg writes.

For WhatsApp, Instagram and TikTok the card carries **Connect** — one press,
and the browser leaves for the page Chatfuel serves for that platform's OAuth,
coming back here with the channel connected. Once something is connected the
same card offers **Refresh access**, which re-grants its permissions and
touches nothing else.

Two things are worth knowing before changing anything. First, **connecting is a
hand-off, not a form**: nothing in this API carries somebody through a
platform's consent screens, so the app mints a one-shot platform link with both
redirects pointing back at this page and spends it immediately. The link is a
credential with a job — it is never shown, copied or kept, and
`lib/returnUrl.ts` is the one place that builds the address it returns to.
Second, **reading and managing are two different questions**: `contactScopes`
needs only access to the bot, while the three writes need Configure: Edit, so a
role without it sees the connection state and no control at all. Read
`references/guide.md` in chatfuel-channels and
`../chatfuel-core/references/platform-links.md` before touching the write path.

First-task ideas:
1. Press Connect on a platform nothing is connected to and follow the hand-off
   through to the end — on a deployment served over https it lands back on this
   page with the channel connected.
2. Say something on the way back: `readHandOff` in `lib/returnUrl.ts` hands the
   page a result, and `ChannelsWorkspace` decides what it is worth.
3. Add a "connected on" line: the scope carries more than the card prints —
   `hooks/useChannelsStore.ts` reads it and `lib/channels.ts` reduces it.
4. Show the Facebook pages' pictures: `FbPage.picture` is a `File`, and
   `../chatfuel-core/references/files-tasks.md` says how a file is read back.

Things that look like bugs and are not: **on `npm run dev` the hand-off does not
come back**, because the API refuses a redirect that is not https and the page
is on http — finish on Chatfuel's page and press Back; `contactScopes` comes
back in no fixed order, so the page sorts by platform itself; a bot can carry
several Facebook pages and they all list under one card; TikTok's `username`
and `name` are both nullable and the card falls back to the account id; the web
widget has no Disconnect because the server refuses it, and prints no name
because `WebWidget.name` is empty on every bot; a channel disconnected in
another tab answers `InternalServerError` rather than naming the miss, because
that refusal is not one of the codes the API publishes, so every failed
disconnect re-reads.
