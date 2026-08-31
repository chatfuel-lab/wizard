# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. Module-specific ideas:

- Element editors are one file per family under `components/editors/` — restyle or trim freely; the never-crash fallback (`GenericElementView`) must stay.
- Auto-layout (`lib/layout.ts`) is pure BFS — swap in dagre/elkjs if you want prettier layouts.
- Creating a flow is two writes, not one: `createFlow` takes no name and answers with the Bot rather than the flow, so `hooks/useFlowsList.ts` works out which id is new by diffing the list it just got back (`lib/flowList.ts`) and then sends `updateFlowName`. A rename that fails leaves the flow — it is opened anyway, because losing a flow that is already on the server would be worse than an unnamed one.
- Rename and delete are on the rail row's own menu, and both go through `lib/flowList.ts` (`patchName`, `dropFlow`) so a flow inside a group is reached as surely as one in the flat lists. `deleteFlow` answers with ids only — not enough to rebuild the rail from, which is why the local state drops the id rather than adopting the response.
- The group CRUD (`createFlowGroup`, `updateFlowGroupName`, `deleteFlowGroup`, `moveFlowToGroup`, `removeFlowFromGroup`) and both sort mutations are generated in `examples/operations.graphql` and have no control yet — the rail is the place to put one.
- Read-only by API design: widget entry point, the switch-to-human quartet, WA template content beyond params, AI token counters.
