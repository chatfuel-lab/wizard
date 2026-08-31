# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. Module-specific ideas:

- Attachment sending and markdown rendering are built in — the attachment tray, upload routing and limits are pure logic under `lib/`, easy to retune.
- The chunk buffer / overwrite-on-final reducer is pure (`lib/threadStore.ts`) — safe to restyle around.
