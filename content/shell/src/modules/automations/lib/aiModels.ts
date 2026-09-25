/**
 * The AI model the bot answers with — labels, prices and the save decision.
 *
 * The choice is per BOT (`Bot.openAIConfig.model`), not per scope: one value
 * for every automation on the bot, no inheritance. `null` is "the server's
 * default", which is whichever option comes back with `isDefault`.
 *
 * The API carries model ids and nothing else — no names, no prices. The table
 * below is the one the Chatfuel dashboard shows: OpenAI's list price per
 * million tokens plus Chatfuel's 10% markup, in US dollars. An id the table
 * does not know (a model an admin set by hand, or one added after this file)
 * prints as the raw id with a dash for each price rather than being hidden.
 */

export interface AiModelInfo {
  label: string;
  /** US$ per 1M input tokens, markup included. */
  input: number;
  /** US$ per 1M output tokens, markup included. */
  output: number;
}

export const AI_MODELS: Readonly<Record<string, AiModelInfo>> = {
  'gpt-5.4-nano-2026-03-17': { label: 'GPT-5.4 Nano', input: 0.22, output: 1.38 },
  'gpt-5.4-mini-2026-03-17': { label: 'GPT-5.4 Mini', input: 0.83, output: 4.95 },
  'gpt-5.4-2026-03-05': { label: 'GPT-5.4', input: 2.75, output: 16.5 },
  'gpt-5.4-pro-2026-03-05': { label: 'GPT-5.4 Pro', input: 33, output: 198 },
  'gpt-5.5-2026-04-23': { label: 'GPT-5.5', input: 5.5, output: 33 },
  'gpt-5.5-pro-2026-04-23': { label: 'GPT-5.5 Pro', input: 33, output: 198 },
};

export interface AiModelOption {
  model: string;
  isDefault: boolean;
}

export const modelLabel = (model: string): string => AI_MODELS[model]?.label ?? model;

const usd = (value: number | undefined): string => (value === undefined ? '–' : `US$${value.toFixed(2)}`);

/** "Input US$0.22 · Output US$1.38 / 1M tokens", or dashes for a model the table does not know. */
export const modelPrice = (model: string): string =>
  `Input ${usd(AI_MODELS[model]?.input)} · Output ${usd(AI_MODELS[model]?.output)} / 1M tokens`;

/** The default model — the option the server marks, or null when it marks none. */
export const defaultModel = (options: readonly AiModelOption[]): string | null =>
  options.find((option) => option.isDefault)?.model ?? null;

/** What is in use: the bot's own choice, else the default. */
export const effectiveModel = (current: string | null, options: readonly AiModelOption[]): string | null =>
  current ?? defaultModel(options);

/**
 * What the radio list offers: the options in server order, plus the bot's own
 * model at the top when it is not among them (an admin set it by hand) — the
 * current value must always be on screen, even when it cannot be picked again.
 */
export function listedModels(current: string | null, options: readonly AiModelOption[]): string[] {
  const models = options.map((option) => option.model);
  return current && !models.includes(current) ? [current, ...models] : models;
}

/**
 * The write a Save needs, the dashboard's rule:
 * - nothing, when the pick is what is already in use;
 * - UNSET, when the pick is the default — so the bot follows the default when
 *   it moves, instead of being pinned to today's;
 * - SET otherwise.
 */
export function saveAction(
  current: string | null,
  chosen: string,
  options: readonly AiModelOption[],
): 'none' | 'set' | 'unset' {
  if (chosen === effectiveModel(current, options)) return 'none';
  if (chosen === defaultModel(options)) return 'unset';
  return 'set';
}
