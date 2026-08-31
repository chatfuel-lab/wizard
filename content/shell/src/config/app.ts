/**
 * This deployment's settings. YOURS TO EDIT — nothing upstream will overwrite
 * it.
 *
 * The wizard writes this file once and records it as generated, which is what
 * makes `chatfuel update` skip it for the life of the app. Everything left out
 * takes the value in `defaults.ts`, which is the upstream's and does keep
 * moving, so leaving a setting out is how you keep getting its improvements.
 *
 * See `defaults.ts` for what each setting means, and for the reason most of
 * what looks configurable is deliberately not here.
 */
import type { AppConfig } from './defaults';

export const APP_CONFIG_OVERRIDES: Partial<AppConfig> = {
  // currency: 'USD',
};
