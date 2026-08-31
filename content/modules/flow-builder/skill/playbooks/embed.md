# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<FlowBuilderApp />` from `src/chatfuel/modules/flow-builder/`.
- Deep-link params: `?flow=<flowID>&b=<blockID>`.
- No extra dependencies. The canvas is `~ui`'s own (`src/vendor/ui/canvas`),
  which the vendored `src/chatfuel/ui/` already carries, so this module's
  dependency list is `{}` like every other module's. It used to need
  `@xyflow/react` and a side-effect import of that package's stylesheet;
  both are gone, and a host upgrading across that change should remove them.
- No flow subscriptions exist: state reconciles from mutation returns +
  refetch; an HTTP-only proxy is fully functional.
