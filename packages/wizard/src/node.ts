/**
 * The Node floor, and the one thing a non-developer can act on when they are
 * under it. Kept in step with `bin/chatfuel-wizard.cjs`, which repeats a short
 * form of this: that launcher is the only code that runs when the bundle
 * itself is too new for the installed Node to parse.
 */
export const MIN_NODE = '22.19.0';

/** [major, minor, patch] of a version string; missing parts read as 0. */
function parts(version: string): [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((n) => Number.parseInt(n, 10) || 0);
  return [major, minor, patch];
}

/** Is this Node new enough? A plain major comparison used to be enough; the dependencies the wizard now ships are not in every 22.x. */
export function nodeIsSupported(version: string = process.versions.node): boolean {
  const [have, wantAtLeast] = [parts(version), parts(MIN_NODE)];
  for (let i = 0; i < 3; i += 1) {
    if (have[i]! > wantAtLeast[i]!) return true;
    if (have[i]! < wantAtLeast[i]!) return false;
  }
  return true;
}

const NODE_DOWNLOAD_URL = 'https://nodejs.org/en/download';

/**
 * The shortest path to a supported Node on this platform: a package manager the
 * machine most likely already has, or nothing.
 *
 * Linux gets nothing on purpose. What used to be here piped
 * https://fnm.vercel.app/install straight into bash — whatever that URL answers
 * with, unread, as the person who ran the wizard. This is a tool that then asks
 * the same person for a Supabase access token and a GitHub sign-in, and it is
 * not going to be the thing that teaches them to run a URL. The installer link
 * above is the same Node, and it is the whole of what this line was for.
 */
function nodeInstallCommand(platform: NodeJS.Platform = process.platform): string | undefined {
  if (platform === 'darwin') return 'brew install node';
  if (platform === 'win32') return 'winget install OpenJS.NodeJS.LTS';
  return undefined;
}

export function nodeUpgradeHint(platform: NodeJS.Platform = process.platform): string {
  const command = nodeInstallCommand(platform);
  return [
    `The wizard needs Node ${MIN_NODE} or newer (you have ${process.versions.node}).`,
    '',
    `Download the LTS installer:  ${NODE_DOWNLOAD_URL}`,
    ...(command ? [`Or from a terminal:          ${command}`] : []),
    '',
    'Then run the wizard again — nothing else needs to be installed by hand.',
  ].join('\n');
}
