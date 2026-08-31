/**
 * Pure analysis of GraphQL payloads — what a request names, what an answer
 * says. Nothing here talks to the network or holds state.
 */
import { Kind, parse } from 'graphql';
import type { DocumentNode, FieldNode, FragmentDefinitionNode, SelectionSetNode, ValueNode } from 'graphql';

/**
 * The API sometimes wraps a failure: the code that says what actually went
 * wrong sits at errors[].extensions.errors[].extensions.code, under a generic
 * outer message. Both levels are read, so a flatter envelope keeps working too.
 */
export function graphqlErrorCodes(payload: unknown): string[] {
  const codes: string[] = [];
  const visit = (entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return;
    const extensions = (entry as { extensions?: unknown }).extensions;
    if (!extensions || typeof extensions !== 'object') return;
    const code = (extensions as { code?: unknown }).code;
    if (typeof code === 'string') codes.push(code);
    const nested = (extensions as { errors?: unknown }).errors;
    if (Array.isArray(nested)) for (const item of nested) visit(item);
  };
  const errors = (payload as { errors?: unknown } | null | undefined)?.errors;
  if (Array.isArray(errors)) for (const entry of errors) visit(entry);
  return codes;
}

/**
 * A bare upstream failure the API relays with no code of its own names an
 * internal service in its outer message. `scrubUpstreamErrors` rewrites that
 * message to a neutral text so the name never reaches the client, and tags such
 * an entry with this code so a caller can classify it by code instead of by
 * matching the message text.
 */
export const UPSTREAM_SERVICE_ERROR_CODE = 'UpstreamServiceError';

/* The word an upstream failure names its internal service in, matched without
   its first letter so one pass over the bytes covers both the capitalised
   sentence the API writes today and a rewording that does not capitalise it.
   The sentence itself is matched separately, and only to replace it in place. */
const SERVICE_FAILURE_MARKER = 'ubgraph';
const SERVICE_NAME_IN_MESSAGE = /Failed to fetch from Subgraph '[^']*'\.?/g;
const NEUTRAL_UPSTREAM_MESSAGE = 'The upstream service rejected the request.';

/** How deep an `extensions` object is searched for a string naming a service. */
const EXTENSIONS_MAX_DEPTH = 8;

/**
 * Cheap pre-check before the parse: worth scrubbing? A response body arrives as
 * bytes and a socket frame as text, and both answer the same question.
 */
export function mayNameUpstreamService(body: Buffer | string): boolean {
  return body.includes(SERVICE_FAILURE_MARKER);
}

function entryHasCode(extensions: { code?: unknown; errors?: unknown } | undefined): boolean {
  if (typeof extensions?.code === 'string' && extensions.code) return true;
  const nested = extensions?.errors;
  if (Array.isArray(nested)) {
    for (const inner of nested) {
      const code = (inner as { extensions?: { code?: unknown } })?.extensions?.code;
      if (typeof code === 'string' && code) return true;
    }
  }
  return false;
}

/**
 * The message a caller gets instead of one that names an internal service. The
 * sentence the API writes today is replaced where it stands, so a message that
 * also says something the caller can act on keeps that half. A message still
 * naming a service after that is a wording this proxy does not know, and the
 * whole of it goes rather than the part that happened to match.
 *
 * Exported because a message is not always inside an error envelope: a socket's
 * close reason is bare text, and it reaches the browser too.
 */
export function neutraliseServiceName(message: string): string {
  const rewritten = message.replace(SERVICE_NAME_IN_MESSAGE, NEUTRAL_UPSTREAM_MESSAGE).trim();
  return rewritten.includes(SERVICE_FAILURE_MARKER) ? NEUTRAL_UPSTREAM_MESSAGE : rewritten;
}

/**
 * The same removal for the strings under `extensions`, which the message rule
 * cannot reach: an upstream that carries the service in a field of its own
 * rather than in the sentence would otherwise ship it verbatim. Only a string
 * that names one is touched, so the codes and nested errors the UI reads
 * survive. A name arriving under a key with none of the marker in it is not
 * detectable here — that is the residual this whole mechanism has, and why the
 * pre-check gates on the same word.
 */
function scrubStrings(node: unknown, depth: number): boolean {
  if (depth > EXTENSIONS_MAX_DEPTH || !node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  let scrubbed = false;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      if (value.includes(SERVICE_FAILURE_MARKER)) {
        record[key] = NEUTRAL_UPSTREAM_MESSAGE;
        scrubbed = true;
      }
    } else if (scrubStrings(value, depth + 1)) {
      scrubbed = true;
    }
  }
  return scrubbed;
}

function rewriteEntry(entry: unknown): void {
  if (!entry || typeof entry !== 'object') return;
  const e = entry as { message?: unknown; extensions?: { code?: unknown; errors?: unknown } };
  let scrubbed = false;
  if (typeof e.message === 'string') {
    const rewritten = neutraliseServiceName(e.message);
    if (rewritten !== e.message) {
      e.message = rewritten;
      scrubbed = true;
    }
  }
  const nested = e.extensions?.errors;
  if (Array.isArray(nested)) for (const inner of nested) rewriteEntry(inner);
  // Last, so the nested entries kept the useful half of their own messages
  // first; whatever still names a service down here is a shape with no rule.
  if (scrubStrings(e.extensions, 0)) scrubbed = true;
  // A named failure that carries no code of its own is otherwise only
  // classifiable by the name just removed — and it stood in the message or in a
  // field under extensions, either way. Give it one that is safe to ship.
  if (scrubbed && !entryHasCode(e.extensions)) {
    e.extensions = { ...(e.extensions ?? {}), code: UPSTREAM_SERVICE_ERROR_CODE };
  }
}

/**
 * Strip any relayed internal service name from a GraphQL error envelope, in
 * place, at every level. Returns the same payload for chaining. A payload with
 * no `errors` array is untouched.
 */
export function scrubUpstreamErrors(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const errors = (payload as { errors?: unknown }).errors;
  if (Array.isArray(errors)) for (const entry of errors) rewriteEntry(entry);
  return payload;
}

/**
 * An argument naming a bot, wherever it sits: `botID` on any field (the ~586
 * mutations that take one of their own), and the same name inside an input
 * object.
 *
 * The document is parsed rather than pattern-matched. An argument's value can
 * be a variable, a string literal, or a variable's default, on any field at any
 * depth, behind an alias or inside a fragment — a fence that reads the query as
 * text has to be right about all of those at once, and one it misses is a bot
 * reached with the deployment's own token.
 */
export const BOT_ID_ARGUMENTS = new Set(['botID', 'botId']);

/**
 * The fields whose bot argument is NOT called `botID`. Three of them in the
 * whole schema, and all three call it `id`, so this fence can only see the bot
 * they name by knowing the field it sits on.
 *
 * The list is not maintained by hand: the repository's validate gate walks the
 * schema for every argument of type BotID whose name is neither `botID` nor
 * `botId`, and fails when one of them is missing here or when an entry here no
 * longer exists in the schema. A field missing from this map is a bot reached
 * with the deployment's own token, which is why the check is a build gate.
 */
export const BOT_ID_ARGUMENT_BY_FIELD = new Map<string, string>([
  // Query.bot — the bot itself, and the one field of the three the app calls.
  ['bot', 'id'],
  // Mutation.botInstagramRefetchLatestMedias — pulls the account's Instagram
  // media into the bot; `count` is the second argument, the bot is `id`.
  ['botInstagramRefetchLatestMedias', 'id'],
  // Subscription.botInstagramMediaAdded — the live feed of that same account.
  ['botInstagramMediaAdded', 'id'],
]);

/**
 * Upstream fields that block on a third party finishing a job. Instagram
 * transcodes a video inside the publish call and the mutation waits for it,
 * so these four are the ones that need `slowTimeoutMs` rather than the
 * ordinary budget. Matched on the UPSTREAM field name, not on the client's
 * operation name: which fields are slow is a fact about Chatfuel's API, and
 * stays true whatever a caller names its own operations.
 */
const SLOW_FIELDS = new Set([
  'instagramAccountPublishImage',
  'instagramAccountPublishReel',
  'instagramAccountPublishStory',
  'instagramAccountPublishCarousel',
]);

/** The same four, for callers that hold a query they have not parsed. */
export const SLOW_FIELD_RE = /\binstagramAccountPublish(?:Image|Reel|Story|Carousel)\s*\(/;

/**
 * `currentUser` is the DEPLOYER's Chatfuel account — the master token's. Its
 * `botsV2` lists every bot that account owns, which with a bot per customer is
 * every customer; its `name` / `email` are the deployer's own. So the default
 * under `currentUser` is refusal, and a field is let through only when what it
 * answers is not the account.
 *
 * Three ways a field earns that, one per list below: it says nothing about the
 * account (`id`, `__typename`); it names a bot, and the bot fence checks which
 * (`botRole`, and ACCOUNT_SCOPE_BOT_ARGUMENT); or it names one resource inside
 * a bot, and the resource fence checks it (ACCOUNT_SCOPE_RESOURCE_ARGUMENT).
 * The last two are read off the resolved VALUE of the scoping argument rather
 * than off the field's name, because the argument is what does the work.
 *
 * Spreads are followed into their fragment rather than counted as a violation
 * on sight: what a fragment selects is knowable, and refusing it unread turned
 * a legitimate selection away.
 */
const ACCOUNT_SCOPE_ALLOWED = new Set(['id', 'botRole', '__typename']);

/**
 * Fields under `currentUser` that answer about ONE BOT and say which bot in
 * their own arguments. They hang off the account only because that is where
 * Chatfuel's schema puts them; what they return is inside a bot, and the bot
 * fence already checks the argument that names it.
 *
 * Allowed only when the argument actually resolves to a bot. This is the whole
 * point of listing the argument rather than the field:
 * `coworkerConversationsConnection`'s `botID` is OPTIONAL, and omitted it lists
 * the conversations of every bot the master token's account holds — which,
 * with a bot per customer, is every customer. A `botID` variable that arrives
 * null is the same request written differently, so the value is resolved, not
 * the syntax counted.
 */
const ACCOUNT_SCOPE_BOT_ARGUMENT = new Map<string, string>([['coworkerConversationsConnection', 'botID']]);

/**
 * Fields under `currentUser` scoped to ONE RESOURCE INSIDE a bot rather than to
 * a bot: they name a conversation, and the resource fence is what checks it —
 * the same fence, and the same binding, that covers a flow id or a contact id
 * reached anywhere else.
 *
 * The fence is on by default wherever this guard is (`resourceFence` resolves
 * to `bound` when auth is on), and in `bound` mode it refuses an id it has
 * seen belong to another bot and forwards one it knows nothing about. So the
 * promise here is the deployment's usual one for an in-bot handle, no weaker
 * and no stronger: the same conversation ids already reach upstream through
 * `coworkerConversationSendMessage(id:)` and its eight siblings, which are
 * root mutations and were never in this guard's way.
 */
const ACCOUNT_SCOPE_RESOURCE_ARGUMENT = new Map<string, string>([['coworkerGetConversation', 'id']]);

/**
 * The same question one step further in: a `Bot` reached by id is the caller's
 * own, but some of what hangs off it answers about the ACCOUNT that holds it,
 * and one field hands out a credential.
 *
 *  - `apiToken` is a credential scoped to that bot which outlives the session
 *    and reaches Chatfuel with NO PROXY in front of it — no fence, no cap, no
 *    account-operation denylist. Reading it once is a permanent way around
 *    everything this file does.
 *  - `invites` is the Chatfuel-side invite list of the deployer's own account
 *    for that bot, down to who issued each one. Nothing in the scaffolded app
 *    reads it; the app's invites are Supabase rows, and its own.
 *
 * `members` is deliberately NOT here. Four modules select it — it is the
 * assignee picker's roster — and what it answers is `PublicUserAccount`: an
 * id, a display name and an avatar, with no address. Under a master token that
 * is the deployer's own name, which the app already renders, and not another
 * customer's anything.
 *
 * `workspace` is narrowed rather than denied, by WORKSPACE_SCOPE_ALLOWED
 * below: it is the deployer's billing container, and `Workspace.bots` lists
 * every bot in it — with a bot per customer, that is the customer list, read
 * through a bot the caller legitimately owns. The app's own `BotInfo` fragment
 * selects `workspace { id title }`, so the field stays reachable.
 *
 * Like `currentUser` above, this is only refused with the gate on: without it
 * the account behind the token is the caller's own.
 */
const BOT_SCOPE_DENIED = new Set(['invites', 'apiToken']);

/** What may be selected under `bot { workspace { … } }`. */
const WORKSPACE_SCOPE_ALLOWED = new Set(['id', 'title', '__typename']);

/**
 * Root operations that act on the CHATFUEL ACCOUNT behind the deployment
 * rather than on any one bot. They name no bot, so no bot fence has anything
 * to check them against and they reach upstream under the master token
 * whatever the deployment's fence is — which is why they are refused by name.
 *
 * Nothing the scaffolded app does calls any of them: they belong to the
 * dashboard the token was issued from, not to an app built on the token. The
 * three families:
 *
 *  - Public API credentials. `createPublicAPIToken` mints a token for the
 *    whole account that outlives every session and every fence; revoking and
 *    resetting one is the same authority pointed the other way.
 *  - Account identity. The `auth*` mutations sign the account in by an
 *    external identity, and `logout` ends its session — a caller who can run
 *    them can move the account the deployment bills to.
 *  - Bot team membership. Granting, changing and removing membership is
 *    addressed by member or invite id, never by bot id, so the fence cannot
 *    see which bot is being handed out.
 *
 * This is a denylist, and a denylist alone is not the end state: the
 * operations an app legitimately needs are a small, knowable set, which is
 * what `allowedOperations.ts` enforces. This list stays underneath it, because
 * an allowlist widened by hand (`CHATFUEL_OPERATION_ALLOWLIST_EXTRA`) or
 * turned off is exactly when these operations must still be refused. See the
 * "Operations the fence cannot check" section of this package's README.
 */
export const ACCOUNT_OPERATIONS = new Set([
  // Public API credentials
  'createPublicAPIToken',
  'revokePublicAPIToken',
  'botResetAPIToken',
  // Account identity
  'authByFacebookOAuthCodeWithRefs',
  'authByFacebookSDKAccessTokenWithRefs',
  'authByFacebookSDKAccessTokenAndroidAppWithRefs',
  'authByGoogleWithRefs',
  'authByGoogleAndroidAppWithRefs',
  'authByAppleForIOSApp',
  'authByInstagramOAuthCode',
  'authByOneTimeShortLivedToken',
  'logout',
  // Bot team membership
  'changeBotMemberRoleV2',
  'removeMemberFromBot',
  'acceptBotInvite',
  'botInviteDelete',
]);

/** What a caller is told instead of having an account-level operation forwarded. */
export const accountOperationMessage = (field: string): string =>
  `${field} acts on the Chatfuel account behind this deployment rather than on a bot, so the proxy does not forward it`;

/**
 * Operations that change the SHAPE of the deployment — which workspaces exist
 * and which bots are in them — refused only with the gate on, because with it
 * off the account behind the token is the caller's own and managing it is what
 * the app is for.
 *
 * With the gate on, every one of them is either a way past a limit the
 * database holds or a way to break the two systems apart:
 *
 *  - `createWorkspaceAndBot`, `workspaceCreate`, `workspaceCreateBot` name no
 *    bot, so every fence passes them, and they create bots on the deployment's
 *    plan WITHOUT going through `cf_new_bot` — which is where both bot caps
 *    live. A signed-up stranger could otherwise spend the deployer's plan in a
 *    loop. Bots are added through `<authPath>/bots`, which reserves the row
 *    first and honours the caps.
 *  - `copyBot` names a bot, so the fence passes it for the caller's OWN bot —
 *    and it still makes a NEW one on the deployment's plan, past `cf_new_bot`
 *    and past both caps, exactly like the three above. Naming a bot is what
 *    makes it look harmless; what it returns is what makes it not.
 *  - `deleteBot` and `renameBot` name a bot, so the fence passes them for the
 *    caller's OWN bot — and that is the problem. The database keeps a
 *    `cf_bots` row per bot; a bot deleted behind its back leaves the app
 *    pointing at something that is gone. Worse, Chatfuel deletes a workspace
 *    when its last bot goes, so the caller's own bot can be the deployment's
 *    whole billing container. `<authPath>/bots/:id` refuses exactly that, and
 *    keeps the two sides in step.
 *  - `workspaceRename`, `workspaceDelete`, `workspaceTransferBot` address the
 *    deployer's workspaces by id, and transferring moves a bot onto a
 *    different plan.
 */
export const ACCOUNT_STRUCTURE_OPERATIONS = new Set([
  'createWorkspaceAndBot',
  'workspaceCreate',
  'workspaceCreateBot',
  'copyBot',
  'workspaceRename',
  'workspaceDelete',
  'workspaceTransferBot',
  'deleteBot',
  'renameBot',
]);

/** What a caller is told instead of having a structural operation forwarded. */
export const accountStructureMessage = (field: string): string =>
  `${field} changes the workspaces and bots of this deployment, which is not a caller's to do — use the app's own bot routes`;

/**
 * The first root field this deployment does not send, or undefined.
 *
 * The denylists above name what is dangerous; this asks the opposite question,
 * and asking it is what turns the fences from a list of holes somebody thought
 * of into a surface somebody chose. The schema is thousands of fields wide and
 * the app uses a few hundred of them, so the ones nobody wrote are reachable
 * under the master token for no reason at all.
 *
 * A NAME check, and only on the root: what may be named, by whom, is still the
 * bot and resource fences' question. See allowedOperations.ts for where the
 * list comes from.
 */
export const disallowedOperation = (roots: readonly string[], allowed: ReadonlySet<string>): string | undefined =>
  roots.find((field) => !allowed.has(field));

/** What a caller is told instead of having an unlisted operation forwarded. */
export const operationNotAllowedMessage = (field: string): string =>
  `${field} is not one of the operations this app sends, and the proxy forwards no other`;

/**
 * How much of the runtime `variables` object is searched for a nested `botID`.
 *
 * A budget on nodes rather than a limit on depth, because the two fail in
 * opposite directions. A depth limit stops descending and says nothing about
 * it, so a `botID` buried one level past the limit was simply never collected
 * — and a request that names no bot at all is a request the fence has nothing
 * to hold, which is how a deep enough input object walked past it under the
 * master token. The budget is here only to keep a hostile body from costing
 * unbounded work, and running out of it is reported (`botIdsInVariables`
 * answers whether it finished) so the request is refused instead of forwarded
 * on an incomplete reading.
 *
 * The ceiling is far above any real operation: the generated ones carry a
 * handful of fields, and 2 MiB of JSON is the body limit above this.
 */
const VARIABLES_MAX_NODES = 10_000;

/**
 * How deep the selection walks below will descend before they refuse the
 * document.
 *
 * These walks recurse, and a fragment spread is a step down: `parse` puts a
 * chain of 40 000 one-line fragment definitions side by side at depth one, and
 * the walk that follows the spreads turns that flat document into 40 000 stack
 * frames. It ran out of stack — a `RangeError` thrown out of a fence, from a
 * body a caller wrote. Past this the document is unreadable, which is the
 * answer everything else here gives for a body it could not finish reading.
 *
 * Nothing generated comes near it: the deepest operation these modules send
 * nests about a dozen selections.
 */
const SELECTION_MAX_DEPTH = 256;

export interface GraphqlFacts {
  /**
   * False when the payload could not be read: not JSON, not an operation, or a
   * query that does not parse. Nothing is known about such a request, so it is
   * refused rather than forwarded under the master token.
   */
  ok: boolean;
  ids: unknown[];
  accountScope: boolean;
  /**
   * True when the document reads the account through a `bot` it may otherwise
   * hold — its workspace's other bots, its Chatfuel team, or its API token.
   * Refused with the gate on, like `accountScope`.
   */
  botScope: boolean;
  slow: boolean;
  /** The first ACCOUNT_OPERATIONS field the document selects at its root, if any. */
  accountOperation?: string;
  /** The first ACCOUNT_STRUCTURE_OPERATIONS field, if any — refused with the gate on. */
  structureOperation?: string;
  /** True when the document asks the schema about itself (__schema, __type). */
  introspection: boolean;
  /**
   * Every opaque resource id the document names — a flow, a contact, a block,
   * a task — with the argument it sat on, for the resource fence. Bot ids are
   * NOT here: they are `ids`, and the bot fence has them.
   */
  resources: ResourceRef[];
  /**
   * The fields the operation selects at its root, following a spread into its
   * fragment — what the operation allowlist is checked against. An alias is not
   * here: it renames the answer, never the field.
   */
  roots: string[];
}

/** One resource id as a request named it. */
export interface ResourceRef {
  /** The argument's name, e.g. `flowID` — what the probe reads to know its kind. */
  argument: string;
  id: string;
}

const UNREADABLE: GraphqlFacts = {
  ok: false,
  ids: [],
  accountScope: false,
  botScope: false,
  slow: false,
  introspection: false,
  resources: [],
  roots: [],
};

/**
 * The introspection meta-fields, which name no bot and so pass every fence.
 * `__typename` is deliberately NOT one of them: every generated operation
 * selects it, and it answers with the type of a field the caller already
 * reached rather than with the shape of the whole schema.
 */
const INTROSPECTION_FIELDS: ReadonlySet<string> = new Set(['__schema', '__type']);

export const INTROSPECTION_MESSAGE = 'This proxy does not forward schema introspection';

export const MALFORMED_QUERY_MESSAGE =
  'This request is not a GraphQL operation the proxy can read, so it was not forwarded';

/**
 * What a request carrying `extensions` is answered with.
 *
 * The upstream body is built from what this proxy read — query, operationName,
 * variables — so anything else the caller wrote would be dropped on the way.
 * Dropping it in silence would leave the caller believing it sent something it
 * did not, and `extensions.persistedQuery` is a SECOND way to name the document
 * to run: a request whose extensions were discarded could execute one document
 * while this proxy fenced another. Nothing in this app sends it (the client
 * sends exactly query, operationName and variables), so the refusal costs no
 * legitimate request.
 */
export const EXTENSIONS_MESSAGE =
  'This proxy forwards only query, operationName and variables; a request carrying extensions is refused rather than sent on without them';

/**
 * The shape of every id Chatfuel hands out for something inside a bot — a
 * flow, a block, a block element, a contact, a conversation, a task: 24 hex
 * characters. It is what makes the resource fence cheap and safe to key on.
 * A value of any other shape is a name, an enum or a cursor, never a handle to
 * another customer's data, so binding one would risk a false refusal for
 * nothing.
 */
export const RESOURCE_ID_RE = /^[0-9a-f]{24}$/i;

/**
 * The id types that are NOT scoped to one bot: the same value is legitimately
 * named by every tenant of this deployment, because it belongs to the account
 * behind the master token rather than to anything inside a bot.
 *
 * `BotID` is here because the bot fence owns it, and the other three because
 * they are the deployer's own — the workspace bots are billed in, and the
 * deployer's user account, which is what an assignee picker offers when the
 * whole Chatfuel team is one master login. Fencing one of those would refuse
 * a request that is not crossing anything.
 */
export const ACCOUNT_SCOPED_ID_TYPES = new Set(['BotID', 'UserAccountID', 'WorkspaceID', 'WorkspaceTeamMemberID']);

/**
 * The argument names carrying one of those types, which the resource fence
 * therefore never reads as a resource.
 *
 * Maintained by the repository's validate gate against the SDL, like
 * BOT_ID_ARGUMENT_BY_FIELD: a schema update that names an account-scoped id
 * something new would otherwise have the fence bind the deployer's own id to
 * whichever tenant happened to read it first, and refuse it for everyone else.
 *
 * `id` is deliberately absent even though `bot(id:)` and `workspace(id:)`
 * carry one: a bare `id` is a resource on most fields (`getTask(id:)`,
 * `file(id:)`), and the two that are not are resolved by the field they sit
 * on — BOT_ID_ARGUMENT_BY_FIELD for the first, and the `currentUser` scope
 * guard, which refuses `workspace` outright, for the second.
 */
export const ACCOUNT_SCOPED_ID_ARGUMENTS = new Set([
  ...BOT_ID_ARGUMENTS,
  'assigneeID',
  'targetWorkspaceID',
  'userID',
  'workspaceID',
]);

/**
 * The arguments that carry a bot-scoped id under a name that says nothing
 * about it — `attachment`, `images`, `logo`, `before`.
 *
 * The naming convention is what the rule below reads, but bot scope lives in
 * the TYPE, and the two part company: `FacebookAttachmentMessageSendInput
 * .attachment` is a `FileID` belonging to one bot, and a name like
 * `setInheritFrom` says less still. Read as descriptions rather than handles,
 * every one of them reached upstream unfenced — and because the fence is only
 * consulted when a request names at least one resource, the miss disabled the
 * whole layer for that request rather than narrowing it.
 *
 * Maintained by the repository's validate gate against the SDL, like
 * BOT_ID_ARGUMENT_BY_FIELD and ACCOUNT_SCOPED_ID_ARGUMENTS: a schema update
 * that adds a tenth would otherwise be a silent hole, and there is nothing in
 * a name to notice it by.
 */
export const RESOURCE_ID_ARGUMENTS = new Set([
  'attachment',
  'before',
  'documents',
  'files',
  'goodsServices',
  'images',
  'logo',
  'setInheritFrom',
  'wabaIDHint',
]);

/**
 * An argument that names something rather than describing it — in the singular
 * or in the plural, or by the schema's own say-so.
 *
 * The plural is not a nicety. `csvContactExportStartByIDsList(botID:,
 * contactIDs:)` names one bot, which the bot fence checks, and a list of
 * contacts, which nothing upstream checks against it; a name ending in `IDs`
 * is exactly the crossing a name ending in `ID` is, and the schema writes ten
 * of them.
 */
const looksLikeIdArgument = (name: string): boolean =>
  name === 'id' || /(ID|Id)s?$/.test(name) || RESOURCE_ID_ARGUMENTS.has(name);

/**
 * How many resource ids one request may name before it is not read at all.
 *
 * Dropping the ids past a ceiling would be the bypass itself — pad the list
 * with junk and the real id falls off the end — so reaching it refuses the
 * request rather than trimming it. It sits far above anything the schema asks
 * for: the longest list is the by-ids contact export, which upstream caps at
 * 100.
 */
const RESOURCES_MAX = 500;

/**
 * One id, or a list of them, as a document or its variables carried it.
 *
 * A list of lists is not a shape this schema has, so one level is all that is
 * walked — and walking no deeper is also what keeps attacker-supplied
 * variables from choosing this function's recursion depth.
 */
function pushResource(argument: string, value: unknown, into: ResourceRef[]): void {
  const one = (item: unknown): void => {
    if (typeof item === 'string' && RESOURCE_ID_RE.test(item)) into.push({ argument, id: item });
  };
  if (Array.isArray(value)) for (const item of value) one(item);
  else one(value);
}

/**
 * Every bot id the runtime variables carry, at any depth — `botID` reaches
 * upstream inside an input object as readily as at the top level — and every
 * resource id beside them, for the resource fence.
 *
 * `botVariables` holds GRAPHQL VARIABLE NAMES, so it is consulted at the top
 * level of this object and nowhere else: there, and only there, a key is a
 * variable name. One level down a key is an input-object FIELD name, and the
 * two namespaces are unrelated — honouring the set at depth let a caller name
 * their own bot variable `$flowID` and hide another tenant's flow id under a
 * `flowID` key inside some other variable, where it was skipped as though it
 * were the bot they had already been granted.
 *
 * False when the budget ran out before the walk finished, which the caller
 * reads as "nothing is known about this request".
 */
function idsInVariables(
  root: unknown,
  into: unknown[],
  resources: ResourceRef[],
  botVariables: ReadonlySet<string>,
): boolean {
  let budget = VARIABLES_MAX_NODES;
  const stack: { value: unknown; named: boolean }[] = [{ value: root, named: true }];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    const { value, named } = entry;
    if (!value || typeof value !== 'object') continue;
    if ((budget -= 1) < 0) return false;
    if (Array.isArray(value)) {
      for (const item of value) stack.push({ value: item, named: false });
      continue;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (BOT_ID_ARGUMENTS.has(key)) into.push(nested);
      else if (!ACCOUNT_SCOPED_ID_ARGUMENTS.has(key) && !(named && botVariables.has(key)) && looksLikeIdArgument(key)) {
        pushResource(key, nested, resources);
      }
      stack.push({ value: nested, named: false });
    }
  }
  return true;
}

function operationFacts(query: string, variables: Record<string, unknown>): GraphqlFacts {
  let doc: DocumentNode;
  try {
    doc = parse(query, { noLocation: true });
  } catch {
    return UNREADABLE;
  }

  const fragments = new Map<string, FragmentDefinitionNode>();
  const defaults = new Map<string, ValueNode[]>();
  for (const def of doc.definitions) {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(def.name.value, def);
    } else if (def.kind === Kind.OPERATION_DEFINITION) {
      for (const variable of def.variableDefinitions ?? []) {
        if (!variable.defaultValue) continue;
        const name = variable.variable.name.value;
        const seen = defaults.get(name);
        if (seen) seen.push(variable.defaultValue);
        else defaults.set(name, [variable.defaultValue]);
      }
    }
  }

  /**
   * A literal is itself; a variable is its runtime value, or its default when
   * it has none.
   *
   * A number is read as the digits it was written with. `BotID` is a custom
   * scalar, and whether the schema coerces `botID: 999` is upstream's business
   * — but a literal this function dropped was a bot id the fence never saw.
   * Anything else in that position is read as null, which no fence holds: the
   * value is answered for rather than lost.
   */
  const resolve = (value: ValueNode): unknown[] => {
    if (value.kind === Kind.STRING) return [value.value];
    if (value.kind === Kind.INT || value.kind === Kind.FLOAT) return [value.value];
    if (value.kind === Kind.LIST) return value.values.flatMap(resolve);
    if (value.kind !== Kind.VARIABLE) return [null];
    const provided = variables[value.name.value];
    if (provided !== undefined && provided !== null) return [provided];
    return (defaults.get(value.name.value) ?? []).flatMap(resolve);
  };

  const ids: unknown[] = [];
  const resources: ResourceRef[] = [];
  /** Variable names that stood in a bot-id position: never resources. */
  const botVariables = new Set<string>();
  const collect = (value: ValueNode, named: boolean, argument: string | null): void => {
    if (value.kind === Kind.LIST) {
      for (const item of value.values) collect(item, named, argument);
    } else if (value.kind === Kind.OBJECT) {
      for (const field of value.fields) {
        const name = field.name.value;
        collect(field.value, BOT_ID_ARGUMENTS.has(name), name);
      }
    } else if (named) {
      if (value.kind === Kind.VARIABLE) botVariables.add(value.name.value);
      ids.push(...resolve(value));
    } else if (argument && !ACCOUNT_SCOPED_ID_ARGUMENTS.has(argument) && looksLikeIdArgument(argument)) {
      for (const resolved of resolve(value)) pushResource(argument, resolved, resources);
    }
  };

  let slow = false;
  const accountScopeFields: FieldNode[] = [];
  const walk = (set: SelectionSetNode): void => {
    for (const selection of set.selections) {
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        walk(selection.selectionSet);
        continue;
      }
      // A spread's fragment is a definition of its own, walked below.
      if (selection.kind !== Kind.FIELD) continue;
      const field = selection.name.value;
      if (SLOW_FIELDS.has(field)) slow = true;
      if (field === 'currentUser') accountScopeFields.push(selection);
      for (const argument of selection.arguments ?? []) {
        const name = argument.name.value;
        collect(argument.value, BOT_ID_ARGUMENTS.has(name) || BOT_ID_ARGUMENT_BY_FIELD.get(field) === name, name);
      }
      if (selection.selectionSet) walk(selection.selectionSet);
    }
  };
  for (const def of doc.definitions) {
    if (def.kind === Kind.OPERATION_DEFINITION || def.kind === Kind.FRAGMENT_DEFINITION) walk(def.selectionSet);
  }
  if (!idsInVariables(variables, ids, resources, botVariables)) return UNREADABLE;

  /**
   * Set by any walk below that hit SELECTION_MAX_DEPTH. Each of them answers a
   * refusal at that point — a walk that stopped early has not proved the thing
   * it exists to prove — but the refusal a caller gets is the unreadable one,
   * because the document was not read to the end.
   */
  let tooDeep = false;

  /**
   * Every fragment these walks have already expanded, one set per walk, shared
   * across the root fields rather than started fresh at each of them.
   *
   * Fresh per root field made the analysis quadratic: R root fields each
   * spreading the head of a chain of F fragments walked the chain R times, and
   * a 230 KB body of that shape cost a second and a half of blocked event loop
   * — inside the body limit, in a fence that runs before anything is
   * forwarded. Sharing costs no verdict. Each of these walks bails out of the
   * whole analysis the moment it finds what it is looking for, so a fragment
   * that is in the set was walked to the end and found clean; skipping it under
   * the next root field skips a subtree already examined in full.
   */
  const allowedSeen = new Set<string>();
  const accountScopeSeen = new Set<string>();
  const reachesSeen = new Set<string>();

  const allowedUnder = (
    set: SelectionSetNode,
    allowed: ReadonlySet<string>,
    seen: Set<string>,
    depth: number,
  ): boolean => {
    if (depth > SELECTION_MAX_DEPTH) {
      tooDeep = true;
      return false;
    }
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        if (!allowed.has(selection.name.value)) return false;
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (!allowedUnder(selection.selectionSet, allowed, seen, depth + 1)) return false;
      } else {
        const name = selection.name.value;
        if (seen.has(name)) continue;
        const fragment = fragments.get(name);
        // A spread with no definition in the document: unreadable, so not ours.
        if (!fragment) return false;
        seen.add(name);
        if (!allowedUnder(fragment.selectionSet, allowed, seen, depth + 1)) return false;
      }
    }
    return true;
  };
  /**
   * Whether a field names something on the argument it is supposed to name it
   * on. The VALUE is resolved rather than the argument counted: an optional
   * argument written with a variable that arrives null is the same request as
   * one that omitted it, and it is the omitted one this guard exists to catch.
   */
  const namesOn = (field: FieldNode, argument: string): boolean =>
    (field.arguments ?? []).some(
      (arg) =>
        arg.name.value === argument &&
        resolve(arg.value).some(
          (value) => (typeof value === 'string' && value.length > 0) || typeof value === 'number',
        ),
    );

  /** One field under `currentUser`: does it answer about the caller or about the account? */
  const accountScopeField = (field: FieldNode): boolean => {
    const name = field.name.value;
    if (ACCOUNT_SCOPE_ALLOWED.has(name)) return true;
    const botArgument = ACCOUNT_SCOPE_BOT_ARGUMENT.get(name);
    if (botArgument !== undefined) return namesOn(field, botArgument);
    const resourceArgument = ACCOUNT_SCOPE_RESOURCE_ARGUMENT.get(name);
    if (resourceArgument !== undefined) return namesOn(field, resourceArgument);
    return false;
  };

  /**
   * The same walk `allowedUnder` does, with a per-field verdict instead of a
   * set membership test — a spread is followed into its fragment, and one
   * unreadable spread refuses the selection.
   */
  const accountScopeOk = (set: SelectionSetNode, seen: Set<string>, depth: number): boolean => {
    if (depth > SELECTION_MAX_DEPTH) {
      tooDeep = true;
      return false;
    }
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        if (!accountScopeField(selection)) return false;
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (!accountScopeOk(selection.selectionSet, seen, depth + 1)) return false;
      } else {
        const name = selection.name.value;
        if (seen.has(name)) continue;
        const fragment = fragments.get(name);
        if (!fragment) return false;
        seen.add(name);
        if (!accountScopeOk(fragment.selectionSet, seen, depth + 1)) return false;
      }
    }
    return true;
  };
  const accountScope = accountScopeFields.some(
    (field) => !field.selectionSet || !accountScopeOk(field.selectionSet, accountScopeSeen, 0),
  );

  /**
   * Whether anything under a root field reaches past the bot it was asked
   * about. The walk descends through every nested selection rather than only
   * the field's own, because a spread or a nested type is the same reach
   * written differently.
   *
   * It is run from EVERY root field, not only from one named `bot`. A `Bot!`
   * is returned by dozens of mutations — `botUpdate`, `botCreate`, the whole
   * settings family — and reading `apiToken` off the bot a mutation hands back
   * is the same read as asking for it under `bot(id:)`. Anchoring the walk on
   * the field's NAME left every one of those unwalked.
   *
   * Descending everywhere costs no legitimate selection, checked against the
   * SDL rather than assumed: `apiToken` exists on exactly one type (`Bot`) and
   * `invites` on two (`Bot`, `Workspace`), and both must be refused wherever
   * they are reached from.
   */
  const reachesPastBot = (set: SelectionSetNode, seen: Set<string>, depth: number): boolean => {
    if (depth > SELECTION_MAX_DEPTH) {
      tooDeep = true;
      return true;
    }
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        const name = selection.name.value;
        if (BOT_SCOPE_DENIED.has(name)) return true;
        if (!selection.selectionSet) continue;
        if (name === 'workspace') {
          if (!allowedUnder(selection.selectionSet, WORKSPACE_SCOPE_ALLOWED, allowedSeen, depth + 1)) return true;
          continue;
        }
        if (reachesPastBot(selection.selectionSet, seen, depth + 1)) return true;
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (reachesPastBot(selection.selectionSet, seen, depth + 1)) return true;
      } else {
        const name = selection.name.value;
        if (seen.has(name)) continue;
        const fragment = fragments.get(name);
        // A spread with no definition here cannot be read, so it is not trusted.
        if (!fragment) return true;
        seen.add(name);
        if (reachesPastBot(fragment.selectionSet, seen, depth + 1)) return true;
      }
    }
    return false;
  };
  /**
   * The fields an operation selects at its root, following a spread into its
   * fragment: `mutation { ...f }` is the same request as writing f's selection
   * inline, and an alias renames the answer, never the field.
   *
   * Collected as nodes rather than names because two checks need them: the
   * operation allowlist reads the names, and the bot-scope walk starts from
   * the selection sets.
   */
  const rootFields = (set: SelectionSetNode, seen: Set<string>, into: FieldNode[], depth: number): void => {
    if (depth > SELECTION_MAX_DEPTH) {
      tooDeep = true;
      return;
    }
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        into.push(selection);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        rootFields(selection.selectionSet, seen, into, depth + 1);
      } else {
        const name = selection.name.value;
        if (seen.has(name)) continue;
        seen.add(name);
        const fragment = fragments.get(name);
        if (fragment) rootFields(fragment.selectionSet, seen, into, depth + 1);
      }
    }
  };
  const rootSelections: FieldNode[] = [];
  for (const def of doc.definitions) {
    if (def.kind === Kind.OPERATION_DEFINITION) rootFields(def.selectionSet, new Set(), rootSelections, 0);
  }
  const roots = rootSelections.map((field) => field.name.value);
  const botScope = rootSelections.some(
    (field) => field.selectionSet !== undefined && reachesPastBot(field.selectionSet, reachesSeen, 0),
  );
  const accountOperation = roots.find((field) => ACCOUNT_OPERATIONS.has(field));
  const structureOperation = roots.find((field) => ACCOUNT_STRUCTURE_OPERATIONS.has(field));
  const introspection = roots.some((field) => INTROSPECTION_FIELDS.has(field));
  // After every walk that could set it, and before anything is answered off
  // what they found: a walk that stopped at the ceiling read part of a
  // document, and part of a document is not a reading this fence acts on.
  if (tooDeep) return UNREADABLE;

  // The same id reaches here twice when it was written as a variable: once
  // where the document named it, once where the variables carried it.
  const seenResources = new Set<string>();
  const unique = resources.filter((resource) => {
    const key = `${resource.argument}|${resource.id.toLowerCase()}`;
    if (seenResources.has(key)) return false;
    seenResources.add(key);
    return true;
  });
  /* Counted after the duplicates are gone, because a list written as a
     variable arrives twice — once where the document named it, once where the
     variables carried it — and a ceiling that counted both would be half the
     ceiling it says it is. */
  if (unique.length > RESOURCES_MAX) return UNREADABLE;

  return {
    ok: true,
    ids,
    accountScope,
    botScope,
    slow,
    accountOperation,
    structureOperation,
    introspection,
    resources: unique,
    roots,
  };
}

/**
 * The one bot an answer can be attributed to, or undefined when the request
 * named none or more than one — with two, which of them an id in the answer
 * came from is a guess. One bot named twice (the document and the variables
 * both carry it) is still one bot, which is what the set is for.
 */
export const ownerOf = (named: readonly string[]): string | undefined => {
  const unique = new Set(named);
  return unique.size === 1 ? [...unique][0]! : undefined;
};

/** The operation inside a graphql-transport-ws `subscribe` payload. */
export function botIdsInOperation(payload: unknown): GraphqlFacts {
  const entry = readEntry(payload);
  return entry ? operationFacts(entry.query, entry.variables ?? {}) : UNREADABLE;
}

/**
 * One operation as it arrived, cut down to the three fields this proxy speaks:
 * a document, the name of the operation inside it to run, and its variables.
 *
 * Anything else the caller wrote alongside them is not carried — see
 * EXTENSIONS_MESSAGE for the one such field that is refused rather than
 * dropped.
 */
export interface GraphqlEntry {
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>;
}

/**
 * A GraphQL POST body, read once and kept.
 *
 * The body reaching upstream is built FROM THIS rather than forwarded as the
 * bytes arrived, which is what makes the fenced request and the executed
 * request one object instead of two that are believed to match. `JSON.parse`
 * keeps the last of two duplicate keys and another parser may keep the first,
 * so `{"query":"<harmless>","query":"<not>"}` was fenced as one document and
 * run upstream as the other. The WS relay has always reissued its frames for
 * this reason (wsRelay.ts); this is the HTTP side of the same rule.
 */
export interface GraphqlBody {
  /** True when the caller sent a JSON array — reissued in the shape it came in. */
  batch: boolean;
  entries: GraphqlEntry[];
  /** True when any entry carried `extensions`. Refused, never dropped in silence. */
  extensions: boolean;
}

/** One entry of a POST body or a `subscribe` payload, or undefined when it is not one. */
function readEntry(payload: unknown): GraphqlEntry | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const { query, operationName, variables } = payload as {
    query?: unknown;
    operationName?: unknown;
    variables?: unknown;
  };
  if (typeof query !== 'string') return undefined;
  if (operationName !== undefined && operationName !== null && typeof operationName !== 'string') return undefined;
  if (variables !== undefined && variables !== null && typeof variables !== 'object') return undefined;
  return {
    query,
    ...(typeof operationName === 'string' ? { operationName } : {}),
    ...(variables ? { variables: variables as Record<string, unknown> } : {}),
  };
}

/** Whether a payload carries `extensions` — see EXTENSIONS_MESSAGE. */
export function carriesExtensions(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return (payload as Record<string, unknown>).extensions !== undefined;
}

/** The body of a GraphQL POST, or undefined when it is not one. */
export function readGraphqlBody(body: string): GraphqlBody | undefined {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return undefined;
  }
  const batch = Array.isArray(payload);
  const raw = batch ? (payload as unknown[]) : [payload];
  if (raw.length === 0) return undefined;
  const entries: GraphqlEntry[] = [];
  let extensions = false;
  for (const one of raw) {
    const entry = readEntry(one);
    if (!entry) return undefined;
    extensions ||= carriesExtensions(one);
    entries.push(entry);
  }
  return { batch, entries, extensions };
}

/**
 * The body reissued for the upstream: this proxy's own bytes, built from what
 * it read, rather than the caller's.
 */
export function serializeGraphqlBody(body: GraphqlBody): string {
  const one = (entry: GraphqlEntry) => ({
    query: entry.query,
    operationName: entry.operationName,
    variables: entry.variables,
  });
  return JSON.stringify(body.batch ? body.entries.map(one) : one(body.entries[0]!));
}

/** Every fact about a body, read as one: a batch is fenced as a single request. */
export function factsOfBody(body: GraphqlBody): GraphqlFacts {
  // A batch is answered as one: any entry that cannot be read stops the whole
  // body, and the fence sees every bot any entry names.
  const facts: GraphqlFacts = {
    ok: true,
    ids: [],
    accountScope: false,
    botScope: false,
    slow: false,
    introspection: false,
    resources: [],
    roots: [],
  };
  for (const entry of body.entries) {
    const one = operationFacts(entry.query, entry.variables ?? {});
    if (!one.ok) return UNREADABLE;
    facts.ids.push(...one.ids);
    facts.resources.push(...one.resources);
    facts.roots.push(...one.roots);
    facts.accountScope ||= one.accountScope;
    facts.botScope ||= one.botScope;
    facts.slow ||= one.slow;
    facts.introspection ||= one.introspection;
    facts.accountOperation ??= one.accountOperation;
    facts.structureOperation ??= one.structureOperation;
  }
  return facts;
}

export function botIdsInGraphql(body: string): GraphqlFacts {
  const parsed = readGraphqlBody(body);
  return parsed ? factsOfBody(parsed) : UNREADABLE;
}
