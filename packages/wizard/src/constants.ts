/** The shell app's dev port — deep links, outro and handoff all build on it. */
export const SHELL_DEV_PORT = 5173;

export const shellUrl = (path = ''): string => `http://localhost:${SHELL_DEV_PORT}/${path}`;

/** Deep link into a module of the scaffolded shell app. */
export function moduleDeepLink(moduleId: string, params?: Record<string, string>): string {
  const qs = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : '';
  return shellUrl(`${moduleId}${qs}`);
}

/** The apps catalog `--app` presets are fetched from (override: --apps-repo / CHATFUEL_APPS_REPO). */
export const DEFAULT_APPS_REPO = 'https://github.com/chatfuel-lab/chatfuel-apps.git';

/** Where a person goes to see the plan, the bots and the bill. */
export const DASHBOARD_URL = 'https://panel.chatfuel.com';

/** Where people building on the wizard ask each other, and us, for help. */
export const DISCORD_URL = 'https://discord.gg/TmrgcjVqFf';

/** Entered on the checkout page, which carries a promo field for it. */
export const COUPON_CODE = 'SDK';
export const COUPON_VALUE = '$100';
export const COUPON_OFFER = `${COUPON_VALUE} of AI credits, on us`;
