/**
 * The hand-written changelog, read by version or by range.
 *
 * Two readers, one parser. The release workflow asks for one version's section
 * to use as a GitHub Release body; `chatfuel-wizard update` asks for everything
 * between the version an app was built by and the version updating it — which
 * is the only thing that says *why* a file upstream changed, and therefore the
 * only thing that lets the update skill resolve a conflict as more than a
 * three-way merge.
 *
 * Sections are matched by the version token in the heading, not by position, so
 * a version with no section of its own is skipped rather than dragging every
 * heading after it into the answer. A range that lands on no section at all
 * reads as "nothing to say", which is what a caller with nothing to show wants
 * to be told.
 */
export interface ChangelogSection {
  /** The version token in the heading — `Unreleased` is one of the possibilities. */
  version: string;
  /** The heading line as written, date and all. */
  heading: string;
  body: string;
}

const HEADING = /^## +(\S+)/;

export function changelogSections(changelog: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | undefined;
  const lines: string[] = [];

  const close = (): void => {
    if (current) sections.push({ ...current, body: lines.join('\n').trim() });
    lines.length = 0;
  };

  for (const line of changelog.split('\n')) {
    const match = HEADING.exec(line);
    if (match) {
      close();
      current = { version: match[1]!, heading: line.trim(), body: '' };
    } else if (current) {
      lines.push(line);
    }
  }
  close();
  return sections;
}

interface Version {
  numbers: [number, number, number];
  /** Empty for a release, the tag for a prerelease — which sorts before it. */
  prerelease: string;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

function parseVersion(value: string): Version | null {
  const match = SEMVER.exec(value.replace(/^v/, ''));
  if (!match) return null;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ?? '',
  };
}

function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    if (a.numbers[i]! !== b.numbers[i]!) return a.numbers[i]! - b.numbers[i]!;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === '') return 1;
  if (b.prerelease === '') return -1;
  return a.prerelease < b.prerelease ? -1 : 1;
}

/**
 * `0.3.0` gives that section's body alone, because the caller already titles it
 * with the tag. `0.2.0..0.4.0` gives every section after the first version and
 * up to the second, headings included — several sections need to say which is
 * which — newest first, the order the file is written in.
 */
export function releaseNotes(spec: string, changelog: string): string | null {
  const sections = changelogSections(changelog);
  const range = spec.split('..');
  if (range.length < 2) {
    const found = sections.find((section) => section.version === spec.replace(/^v/, ''));
    return found && found.body !== '' ? found.body : null;
  }

  const from = parseVersion(range[0]!);
  const to = parseVersion(range[1]!);
  if (!from || !to) return null;

  const wanted = sections.filter((section) => {
    const version = parseVersion(section.version);
    return version !== null && compare(version, from) > 0 && compare(version, to) <= 0;
  });
  const body = wanted.map((section) => `${section.heading}\n\n${section.body}`.trim()).join('\n\n');
  return body === '' ? null : body;
}
