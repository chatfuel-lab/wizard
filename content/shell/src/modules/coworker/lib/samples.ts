/**
 * Message records for tests, modelled on what the API actually sends —
 * not on what would be convenient to assert against.
 *
 * Two runs are written out here because each carries one of the module's hard
 * parts. The agentic run: the assistant consults a skill, calls two read tools,
 * answers in markdown, navigates the dashboard, then offers quick replies —
 * every message a tool produces has EMPTY content and a single `toolCalls`
 * entry, which is exactly how the API behaves and exactly why an earlier UI
 * showed nothing. The approval batch: the real `create_service` argument shape,
 * nested three deep.
 */

const at = (msAgo: number): string => new Date(Date.now() - msAgo).toISOString();

type Over = Record<string, unknown>;

export const message = (id: string, role: 'user' | 'coworker', content: string, msAgo: number, over: Over = {}) => ({
  __typename: 'CoworkerMessage',
  id,
  clientID: null,
  role,
  content,
  clientActionType: null,
  time: at(msAgo),
  attachments: [],
  toolCalls: [],
  ...over,
});

export type SampleMessage = ReturnType<typeof message>;

/** A tool-result message: empty content, one call. That is what the API sends. */
export const toolStep = (id: string, toolID: string, msAgo: number) =>
  message(id, 'coworker', '', msAgo, {
    toolCalls: [{ __typename: 'CoworkerToolOther', toolID }],
  });

const frontendStep = (id: string, actionType: string, parameters: Record<string, unknown>, msAgo: number) =>
  message(id, 'coworker', '', msAgo, {
    toolCalls: [{ __typename: 'CoworkerFrontendAction', actionType, parameters }],
  });

const MIN = 60_000;

/* Markdown, because the assistant writes markdown: bold, a list and a fence
   all appeared in three short live answers. */
const RUN_ANSWER = `Opened your **Deals** board — that's your pipeline, where leads move across stages.

Right now:

- **34 deals** in total
- **12** sitting in *Sorting* for more than 14 days
- 3 with no assignee at all

\`\`\`json
{ "stuck": 12, "unassigned": 3 }
\`\`\`

Want me to nudge the stuck ones?`;

export const runMessages = (): SampleMessage[] => [
  frontendStep('cw-run-m9', 'suggest_quick_reply', { text: 'Leave them for now' }, 2 * MIN),
  frontendStep('cw-run-m8', 'suggest_quick_reply', { text: 'Show me the 3 unassigned' }, 2 * MIN + 1_000),
  frontendStep('cw-run-m7', 'suggest_quick_reply', { text: 'Nudge the stuck deals' }, 2 * MIN + 2_000),
  message('cw-run-m6', 'coworker', RUN_ANSWER, 2 * MIN + 3_000),
  frontendStep('cw-run-m5', 'navigate', { pathKey: 'Deals' }, 2 * MIN + 8_000),
  toolStep('cw-run-m4', 'chatfuel_gql-list_deals', 2 * MIN + 12_000),
  toolStep('cw-run-m3', 'chatfuel_gql-list_contacts', 2 * MIN + 14_000),
  toolStep('cw-run-m2', 'skill-analytics_instr', 2 * MIN + 18_000),
  message('cw-run-m1', 'user', 'How is my pipeline doing? Open it for me.', 3 * MIN),
];

/* The live shape, verbatim: one tool, needsManualApprove, deep arguments. */
export const APPROVAL = {
  __typename: 'CoworkerToolApprovalRequest',
  requestedInMsgID: 'cw-approve-invisible',
  tools: [
    {
      toolID: 'chatfuel_gql-create_service',
      arguments: {
        botId: 'bot-1',
        service: {
          title: '45-min Colour Consultation',
          description: 'Includes a patch test.',
          durationSeconds: 2700,
          images: [],
          isAvailable: true,
          price: { amount: '80.00', currency: 'EUR' },
        },
      },
      needsManualApprove: true,
    },
    {
      toolID: 'chatfuel_gql-list_specialists',
      arguments: { botId: 'bot-1' },
      needsManualApprove: false,
    },
  ],
};

export const approveMessages = (): SampleMessage[] => [
  message(
    'cw-approve-m3',
    'coworker',
    'I have everything I need. Adding **45-min Colour Consultation** at €80 — approve it and I will write it into your catalog.',
    30_000,
  ),
  toolStep('cw-approve-m2', 'chatfuel_gql-list_catalog', 40_000),
  message('cw-approve-m1', 'user', 'Add a colour consultation, 45 minutes, 80 euros', 55_000),
];
