# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<LivechatApp />` from `src/chatfuel/modules/livechat/`.
- Deep-link params: `?c=<conversationID>` opens a conversation directly.
- Uses subscriptions — the WS relay is REQUIRED (Vite plugin covers it; a
  Next.js host needs the sidecar relay, see the core playbook §4).
- File/image messages ride the `/chatfuel/api/*` upload passthrough.
