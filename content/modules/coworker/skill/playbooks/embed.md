# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<CoworkerApp />` from `src/chatfuel/modules/coworker/`.
- Deep-link params: `?c=<conversationID>`.
- Streaming rides ONE bot-scoped subscription — the WS relay is REQUIRED.
- Tool-approval banner: closing/ignoring it implicitly rejects the action; keep that copy honest if you restyle.
