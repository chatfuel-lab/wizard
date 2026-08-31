import type { NewPost, QueuedPost } from '../../types';

/**
 * Where this app's own posts live.
 *
 * Nothing on the Chatfuel API stores a post: it publishes and forgets, and
 * `InstagramPost` has neither a status nor a timestamp. So a draft, a scheduled
 * time and a failure that can be retried all have to be kept somewhere else,
 * and there are exactly two somewheres a deployment might have.
 *
 * Both implement this. The difference between them is not how they read and
 * write — it is `canSchedule`: only a backend with something running beside it
 * can make a post go out while nobody is looking, and a queue that cannot do
 * that must not offer a time picker at all.
 */
export interface QueueBackend {
  /** Told apart in errors and in the skill docs; never shown on screen. */
  readonly kind: 'proxy' | 'userStorage';
  /**
   * Whether a post given a future time will actually go out at it.
   *
   * False is the honest answer for a store the browser is the only reader of.
   * The composer offers "save" and "publish now" and no schedule control —
   * absent, not disabled with an explanation beside it.
   */
  readonly canSchedule: boolean;
  /** Everything this bot has, newest activity first. */
  list(): Promise<QueuedPost[]>;
  create(post: NewPost): Promise<QueuedPost>;
  update(id: string, patch: Partial<QueuedPost>): Promise<QueuedPost>;
  remove(id: string): Promise<void>;
}
