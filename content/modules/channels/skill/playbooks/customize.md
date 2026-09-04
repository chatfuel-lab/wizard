# Customizing this module

Every knob, and what moving it costs.

| Knob | Where | Notes |
|---|---|---|
| Platform order and titles | `LINK_PLATFORMS`, `PLATFORM_TITLES` in `lib/channels.ts` | The three platforms that take a link. Adding one here without the server's enum member gives a card whose Connect answers `PlatformNotSupportedForOperationLink`. |
| How a scope prints | `channelsOf` in `lib/channels.ts` | Label and detail per `__typename`. A new platform on the server is skipped until it is added here. |
| Where the hand-off comes back to | `lib/returnUrl.ts` | The address in both redirects, and the two keys it carries. It refuses to build one that is not https, because the API refuses it too — that is why a dev server gets none. |
| What the return leg says | `ChannelsWorkspace.tsx` | A toast on the way back, an alert when it did not finish. The read on mount is what puts a channel on screen either way. |
| The re-read throttle | `CHANNELS_REFETCH_THROTTLE_MS` in `hooks/useChannelsStore.ts` | How long a tab may have been away before coming back re-reads. Channels change on somebody else's page, so this is the whole of how this one learns. |
| The error sentences | `MESSAGES` in `lib/errors.ts` | Keyed by `extensions.code`, nested or top-level. `ContactScopeDoesNotExist` is matched as a raw string — it is not in the bundled enum. |
| Which refusals mean "already gone" | `isAlreadyGone` in `lib/errors.ts` | These re-read instead of showing an error. |
| The rail item | `index.tsx` and the `settings` group in the app's nav table | The module sits under Settings in this shell; a host with its own navigation places it where it likes. |

**Not a knob: the link.** It is minted at the moment somebody presses Connect,
spent by the redirect that follows, and never held anywhere. Showing it, keeping
it or offering to copy it turns a one-press connect into an errand — and the
person it would be handed to is the one already sitting in front of the screen.
