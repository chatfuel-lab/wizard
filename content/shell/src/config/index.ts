/**
 * The one resolved config, and the only thing anything else imports.
 *
 * Merged at module load and frozen: a setting is a fact about the deployment,
 * so it does not change while the app is running, and a caller that could
 * assign to it would be a second way to set it.
 */
import { DEFAULT_APP_CONFIG, type AppConfig } from './defaults';
import { APP_CONFIG_OVERRIDES } from './app';

export type { AppConfig } from './defaults';
export { DEFAULT_APP_CONFIG } from './defaults';

export const APP_CONFIG: Readonly<AppConfig> = Object.freeze({
  ...DEFAULT_APP_CONFIG,
  ...APP_CONFIG_OVERRIDES,
});
