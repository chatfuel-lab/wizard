/**
 * Every rule the publishability gate enforces, and every exception to one.
 *
 * They live here rather than beside the scanner for a reason the scanner cannot
 * fix: a file that spells out the words it bans fails its own scan, so the
 * scanner used to exempt itself by path - and with itself, every sentence of
 * prose it carried. This file is the only thing the exemption now covers, and
 * it is kept to literals: the patterns, the reasons, and the waivers.
 * `check-publishable.ts` is scanned like anything else.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export type Rule = readonly [pattern: RegExp, reason: string];

// ---------------------------------------------------------------------------
// Rule 1 - English only
// ---------------------------------------------------------------------------

/**
 * Any letter from a non-Latin alphabet. Deliberately a script test and not an
 * ASCII test: `—`, `⌘`, `⚠` and every accented Latin letter are fine, and an
 * ASCII test would reject them while missing nothing extra.
 */
export const NON_LATIN = new RegExp(
  '[\\p{Script=Cyrillic}\\p{Script=Greek}\\p{Script=Han}\\p{Script=Hiragana}' +
    '\\p{Script=Katakana}\\p{Script=Hangul}\\p{Script=Arabic}\\p{Script=Hebrew}' +
    '\\p{Script=Thai}\\p{Script=Devanagari}\\p{Script=Armenian}\\p{Script=Georgian}]',
  'gu',
);

/**
 * Greek letters that are read as mathematics rather than as Greek: `Σ 412k` is
 * English. Listed one by one so that Greek prose still fails.
 */
export const MATH_SYMBOLS: ReadonlySet<string> = new Set(['Σ', 'σ', 'μ', 'π', 'Δ', 'δ', 'λ', 'Ω', 'θ', 'α', 'β']);

/**
 * Non-English words that were once column-header aliases in the knowledge-base
 * importer. Only the distinctive ones: a list of function words ("der", "die",
 * "man", "so") would fire on English prose and teach everyone to ignore it.
 */
export const FOREIGN_WORDS =
  'pregunta|pergunta|frage|domanda|vraag|pytanie|soru|fraga|sporsmal|kysymys|' +
  'respuesta|resposta|reponse|antwort|risposta|antwoord|odpowiedz|cevap|vastaus|' +
  'nombre|producto|articulo|produto|titre|produit|bezeichnung|titolo|prodotto|' +
  'nazwa|produkt|urun|baslik|naam|descripcion|detalles|descricao|beschreibung|' +
  'descrizione|dettagli|omschrijving|aciklama|precio|importe|coste|preco|prix|' +
  'montant|preis|betrag|prezzo|importo|fiyat|tutar|prijs|moneda|divisa|moeda|' +
  'devise|monnaie|wahrung|waluta|parabirimi|disponibilidad|existencias|' +
  'disponivel|estoque|disponibilite|verfugbar|lagerbestand|disponibile|' +
  'disponibilita|voorraad|beschikbaar|dostepny|stokta|mevcut';

// ---------------------------------------------------------------------------
// Rule 2 - nothing that names what only we can see
// ---------------------------------------------------------------------------

/** Banned in every scanned tree, and safe to write down in a public file. */
export const TRACKED_BANNED: readonly Rule[] = [
  // Case-insensitive: a lower-case `todo:` in a schema description once
  // slipped through a case-sensitive test.
  [/\b(?:TODO|FIXME|HACK|XXX|TBD|WIP)\b/gi, 'an unfinished-work marker'],
  [/\b(?:GERMAN|RUSSIAN)_STOPWORDS\b|\bCYRILLIC_(?:TRUE|FALSE)\b/g, 'a non-English table'],
  [new RegExp(`\\b(?:${FOREIGN_WORDS})\\b`, 'gi'), 'a non-English word'],
  // An issue-tracker id: 2-5 uppercase letters, a dash, 2-6 digits. The
  // negative lookahead spares the technical tokens that share the shape and
  // are not trackers - HTTP-200, UTF-16, ISO-8601, SHA-256, RFC-7231,
  // AES-256, CVE-2021, NON-200, GPT-<n>. Any prefix not on that list is
  // caught, which is the point; a genuinely new safe prefix is a diff here.
  // Case-sensitive on purpose, unlike the marker rule above: lowercased, the
  // shape is every hyphenated identifier a codebase is full of - node-20,
  // draft-07, sha-256 in a url - and the rule would stop every publish.
  [/\b(?!(?:UTF|HTTP|NON|ISO|SHA|RFC|AES|CVE|GPT)-\d)[A-Z]{2,5}-\d{2,6}\b/g, 'an issue-tracker id'],
  // A lowercase commit hash next to a VCS marker (origin/, commit, ref, at, @).
  // Pinned action SHAs in .github/workflows are legitimate and spared by an
  // ALLOW rule scoped to that directory. Pure-digit runs (years, counts) are
  // excluded so a date does not read as a hash.
  [/(?:\borigin\/\S+\s*\(?|\bcommit\s+|\bref\s+|\bat\s+|@)(?![0-9]+\b)[0-9a-f]{7,40}\b/gi, 'an internal commit hash'],
  // Unreleased or ahead-of-production state: a roadmap the reader is not owed.
  [
    /\b(?:ahead of prod|not on prod|not yet on prod|outside the experiment|not yet released|unreleased internally)\b/gi,
    'unreleased or ahead-of-production state',
  ],
  // Provenance only an insider has. What the API does is worth writing down;
  // where the author read it is not. A sentence that sources a fact to a schema,
  // a description or a console the reader cannot open tells them these docs were
  // written with access nobody outside the vendor has - and points at the
  // surface to go looking for.
  [
    /\b(?:dashboard|admin|internal|private)(?:'s)? (?:own )?(?:schema|SDL|graph|exporter|introspection)\b/gi,
    'a source only we can read',
  ],
  // An instruction sourced to the people who run the service. A parenthetical
  // like "(backend guidance)" tells the reader the limit is a spoken
  // arrangement rather than something the API enforces - which invites them to
  // test it - and cites a conversation nobody outside the vendor could have
  // had. The reason survives, the attribution does not.
  [
    /\b(?:backend|platform|infra(?:structure)?|api)\s+(?:team|guidance)\b|\b(?:internal|team)\s+guidance\b|\bper\s+the\s+(?:backend|platform|api)\b/gi,
    'an instruction sourced to the people who run the service',
  ],
  // The same fact told the other way round: naming what a published artefact had
  // taken out of it, rather than describing what it contains.
  [
    /\bdescriptions?\s+(?:that\s+)?the\s+(?:bundled\s+)?SDL\s+strips\b|\b(?:cut|stripped|removed|withheld)\s+(?:from|out of)\s+the\s+(?:bundle|SDL|export)\s+(?:on purpose|deliberately)\b/gi,
    'what was taken out of a published artefact',
  ],
  // A number somebody read off a live account. A ceiling, a retention window or
  // a round-trip time measured once is not contract: the reader cannot check it,
  // the API never promised it, and a client built on it is coded against one
  // account on one afternoon. The rule the number was evidence for survives -
  // "rate-limited per token", "short-lived" - and the number does not.
  [/\b\d+(?:\.\d+)?\s*(?:rps|qps|req(?:uest)?s?\/s(?:ec)?)\b/gi, 'a rate ceiling measured on a live account'],
  [
    /\bTTL\s+of\s+(?:~\s*)?\d|\b(?:~\s*)?\d+(?:\.\d+)?[- ]?(?:second|minute|hour|day|week|month)s?\s+(?:\w+\s+)?(?:TTL|retention|expiry)\b/gi,
    'a retention window measured on a live account',
  ],
  // How the number was got, which is worse than the number: it says the author
  // had an account to probe and probed it.
  [
    /\b(?:found by bisecting|bisected (?:it|the limit)|measured on (?:a|our|the) (?:live|real|production)|read off (?:a|our|the) (?:live|production)|live finding|confirmed in practice|measured in practice|on the live bot)\b/gi,
    'a measurement taken against a live account',
  ],
  // The upstream's internal decomposition, which arrives in error envelopes and
  // gets copied into fixtures and docs. `upstream` is the name that says as much
  // as a caller can act on; the real one names a team's service.
  [
    /\bSubgraph\s+'(?!upstream')[A-Za-z][\w-]*'|\bservice(?:Name)?\s*:\s*'(?!upstream')[a-z][\w-]{2,}'/g,
    'an upstream service by its internal name',
  ],
  // The upstream's own infrastructure. A caller cannot address it, cannot choose
  // it and cannot check it; naming it says only which runbook the author has
  // read. What a client can act on is the behaviour - "not kept forever", "goes
  // quiet" - and that survives the cut.
  [
    /\b(?:Redis|Memcached|RabbitMQ|Kafka|ClickHouse|MongoDB|DynamoDB|Elasticsearch|Cassandra|Sidekiq|Celery)\b/g,
    "the upstream's own infrastructure by name",
  ],
  // A 24-hex literal is the shape of a Chatfuel object id (bot, workspace,
  // contact, deal). The one allowed form is the synthetic all-zeros-but-last
  // id; anything else is a real, addressable object. The allowlist is a shape,
  // not a list of ids - a list is how a real id got called synthetic once.
  [/\b(?!0{23}[0-9a-f]\b)[0-9a-f]{24}\b/gi, 'the shape of a live Chatfuel object id'],
  // ---- Below: shapes, not vocabulary.
  //
  // Each of the next five was in the private overlay alone, which meant the
  // tracked half of the list had nothing to say about the whole class: a fresh
  // clone, a fork's pull request, and every local `pnpm validate` ran without a
  // single rule against them. They belong here because they are forms rather
  // than words - a host that ends in `.internal` names nothing in particular,
  // and writing the form down publishes no host. The overlay keeps what only a
  // dictionary can express; these are what a shape can.
  //
  // A hostname on a network nobody outside can route to. `.local` is not on the
  // list and cannot be: `.env.local` is a filename half this repository is about,
  // and a rule that reads it as a host is a rule everyone learns to skip past.
  [/\b[a-z0-9][a-z0-9-]*\.(?:internal|intranet|corp|lan)\b/gi, 'a hostname on a network the reader cannot reach'],
  // A private address, by RFC 1918. The loopback block is left out on purpose:
  // 127.0.0.1 is the one address in a document that means the reader's machine.
  [
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
    'a private network address',
  ],
  // An absolute path through somebody's home directory. It carries a username,
  // and it describes a machine the reader does not have.
  [
    /(?<![\w.-])(?:\/home\/(?!<)[\w.-]+|\/Users\/(?!<)[\w.-]+|[A-Z]:\\Users\\[\w.-]+)\//g,
    "a path through somebody's home directory",
  ],
  // A named mailbox at the vendor. The role addresses stay: they are how a
  // reader is meant to reach somebody, and they belong to no one person.
  [
    /\b(?!(?:security|support|privacy|legal|abuse|help|hello|noreply|no-reply)@)[\w.+-]+@chatfuel\.com\b/gi,
    'a named mailbox at the vendor',
  ],
  // A link into somewhere only staff can open. It is not a leak of its
  // contents, but it is an instruction to go and read something the reader
  // cannot, in place of writing down what it said.
  [
    /\b(?:[\w-]+\.slack\.com|slack:\/\/|(?:www\.)?notion\.so|[\w-]+\.notion\.site|[\w-]+\.atlassian\.net|linear\.app|[\w-]+\.monday\.com|docs\.google\.com|drive\.google\.com)\b/gi,
    'a link into a workspace only we can open',
  ],
];

/**
 * Rule 2 has a shape that a public file cannot hold: the words worth banning are
 * the ones nobody outside can see, and writing them here to ban them would publish
 * exactly what the rule exists to keep unpublished. So they live in an untracked
 * overlay instead - `scripts/check-publishable.private.json`, gitignored, shaped
 *
 *   { "banned": [{ "pattern": "\\bAcme-\\d+\\b", "flags": "gi", "reason": "a ticket id" }] }
 *
 * Absent, the gate simply runs without it: a fresh clone is not expected to have
 * one, and neither is a pull request from a fork, which GitHub hands no secrets.
 * CI has no file at all - it passes the same JSON in the
 * `CHECK_PUBLISHABLE_OVERLAY` environment variable, which takes precedence, and
 * declares it on one job that installs nothing and runs no code out of the tree
 * it is scanning, rather than writing it to a workspace where every dev
 * dependency in the install could read it. The merge queue therefore sees the
 * full list even when the branch build did not.
 *
 * What a hit says out loud is trimmed to match where the list came from: out of
 * the environment variable, the failure names the entry by its position rather
 * than by its reason, because that failure is read in a public log.
 *
 * Malformed, it stops the run and says so. Read as an empty list instead, a
 * typo would silently shorten the ban list to the tracked half and every gate
 * after it would report clean - which is the one answer this file must never
 * give by accident.
 *
 * Malformed is not the only way to get an empty list, though, and the others are
 * quieter: an environment variable set to nothing or to whitespace, a secret that
 * did not reach the job, valid JSON under a misspelled key. Each of those reads
 * as "no overlay", which on a laptop is the truth and in the one job built to
 * enforce the whole list is a failure wearing a clean answer. So that job says so
 * out loud: `CHECK_PUBLISHABLE_REQUIRE_OVERLAY=1` makes an absent or empty overlay
 * an error instead of a silence. It is set nowhere else - a fresh clone, a fork's
 * pull request and every local run are all expected to have no overlay at all.
 */
const OVERLAY = join(repoRoot, 'scripts', 'check-publishable.private.json');

const OVERLAY_ENV = 'CHECK_PUBLISHABLE_OVERLAY';

const REQUIRE_ENV = 'CHECK_PUBLISHABLE_REQUIRE_OVERLAY';

function overlaySource(): { json: string; where: string; secret: boolean } | undefined {
  const fromEnv = process.env[OVERLAY_ENV]?.trim();
  if (fromEnv) return { json: fromEnv, where: OVERLAY_ENV, secret: true };
  if (existsSync(OVERLAY)) return { json: readFileSync(OVERLAY, 'utf8'), where: OVERLAY, secret: false };
  return undefined;
}

/** Whether this run is the one that must see the whole list. */
function overlayRequired(): boolean {
  const value = process.env[REQUIRE_ENV]?.trim();
  return value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

function overlayBanned(): readonly Rule[] {
  const source = overlaySource();
  if (!source) {
    if (overlayRequired()) {
      throw new Error(
        `${REQUIRE_ENV} is set, so this run enforces the whole ban list, but no overlay reached it: ` +
          `${OVERLAY_ENV} is unset or blank and ${OVERLAY} does not exist. ` +
          'Running on the tracked half would report clean without having looked.',
      );
    }
    return [];
  }
  let parsed: { banned?: { pattern: string; flags?: string; reason: string }[] };
  try {
    parsed = JSON.parse(source.json) as typeof parsed;
  } catch (error) {
    /* The cause carries the parser's excerpt of what it was reading. From a file
       on the maintainer's own machine that is the diagnostic; from the secret it
       is the secret, in a public log. */
    throw new Error(
      `${source.where} is present but unreadable, so the ban list would be short`,
      source.secret ? undefined : { cause: error },
    );
  }
  const entries = parsed.banned ?? [];
  if (entries.length === 0 && overlayRequired()) {
    /* Valid JSON, no entries: a misspelled key, a list emptied by an edit, a
       secret that survived to here as `{}`. The name of the source is safe to
       print - it is a variable name or a path, never the list itself. */
    throw new Error(
      `${REQUIRE_ENV} is set, but the overlay from ${source.where} carries no entries, ` +
        'so the whole list this run exists to enforce is the tracked half of it.',
    );
  }
  return entries.map(({ pattern, flags, reason }, index) => {
    /* A reason out of the secret is never printed. The failure line it ends up
       in goes to a public Actions log, and GitHub masks the whole value of a
       secret rather than the sentences inside it - so the one run that would
       spell the private list out loud is the run that caught something with it.
       The entry's place in the list is enough to look it up on a machine that
       has the file; whoever reads the file already has the reason. Out of the
       untracked file, that is the reader, and they get it. */
    const why = source.secret ? `entry ${index + 1} of the private ban list` : reason;
    return [new RegExp(pattern, flags ?? 'g'), why] as const;
  });
}

export const UNIVERSAL_BANNED: readonly Rule[] = [...TRACKED_BANNED, ...overlayBanned()];

/**
 * Banned only in what a client receives: each is a true fact of this public
 * repository, but in a scaffolded project it names a tool or layout the
 * client does not have.
 */
export const SHIPPED_ONLY_BANNED: readonly Rule[] = [
  [/\bvalidate\.(?:mjs|ts)\b/g, 'a gate that does not exist in their project'],
  [/\bpnpm\b/g, 'a package manager the scaffolded project does not use'],
  [/\bmonorepo\b/gi, 'this repository'],
  // The voice of someone who has seen production, written for someone who has
  // not. A note that a thing was checked against a live bot tells the reader
  // the author had privileged access and when - none of which is theirs.
  [
    /\b(?:verified live|live-verified|live bot|off a live|found live|really sends|undocumented in)\b/gi,
    'a note written from privileged production access',
  ],
  // First-person-plural address in a product that now belongs to the client:
  // their user would be told to report something to a third party with no
  // return address.
  [/\b(?:tell us|let us know|contact us|our team|our account)\b/gi, "the vendor's own voice in the client's product"],
];

/** The full set, for the shipped trees and the packed bytes. */
export const SHIPPED_BANNED: readonly Rule[] = [...UNIVERSAL_BANNED, ...SHIPPED_ONLY_BANNED];

/**
 * Banned only inside a .graphql file, and added to whichever set above already
 * applies. Neither of these files is written here: the SDL arrives already
 * exported, thousands of lines at a time, and the operations documents beside
 * it are written against it. Nobody reads either line by line on the way
 * in. So the words that would be ordinary English anywhere else - a README
 * saying a thing is broken, a SUPPORT page on what to do when it does not
 * work - are, in a schema the API publishes, a fact about our internals: a
 * surface only employees reach, or one that ships broken.
 *
 * The export strips every description, so today an SDL hit could only be a type
 * or field NAME saying it. That is the reason to keep the rules rather than to
 * retire them: the strip is a decision taken in another repository, and a name
 * is the half of the schema no strip can clean up.
 *
 * Scoped to .graphql rather than added to TRACKED_BANNED for exactly that
 * reason: repo-wide, these two patterns match dozens of lines of ordinary prose.
 */
export const SCHEMA_ONLY_BANNED: readonly Rule[] = [
  [
    /\b(?:does not work(?: yet)?|doesn't work(?: yet)?|not implemented(?: yet)?|not yet supported|is broken|always (?:errors|fails))\b/gi,
    'a field the schema itself says is unfinished or broken',
  ],
  [
    /\b(?:employees only|for support|internal[- ]only|staff only|impersonat\w*)\b/gi,
    'a surface only we are meant to reach',
  ],
];

/** Every .graphql file: the SDL the core skill bundles, and the operations beside it. */
export const SDL = /\.graphql$/;

// ---------------------------------------------------------------------------
// Rule 3 - no credentials
// ---------------------------------------------------------------------------

export const SECRETS: readonly Rule[] = [
  [/\b[0-9a-f]{64}\b/gi, 'a 64-hex string, the shape of a Chatfuel token'],
  [/\beyJ[A-Za-z0-9_-]{20,}/g, 'a JWT'],
  /* Wider than hex on purpose, and wider than it used to be: Supabase's own
     tokens are base64-ish, and the scrubber in the wizard (log.ts) has always
     matched them that way. A gate that knows a narrower shape than the masker
     is a gate that passes what the masker was written to hide. */
  [/\bsbp_[A-Za-z0-9_-]{20,}/g, 'a Supabase personal access token'],
  [/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{16,}/g, 'a Supabase API key'],
  /* The four above are the credentials this repository handles itself. These
     are the ones a contributor's machine hands to a paste: they belong to no
     part of the product, which is exactly why nothing else here would catch
     them, and every one of them is live the moment it is published. */
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}\b/g, 'a GitHub fine-grained token'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, 'a Slack token'],
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g, 'an OpenAI or Anthropic API key'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'an AWS access key id'],
  [/\bnpm_[A-Za-z0-9]{36}\b/g, 'an npm token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, 'a Google API key'],
  /* A Supabase project ref is not a credential on its own - it is the address of
     one, and the anon key that goes with it is public by design. It is banned all
     the same: a ref names somebody's real project, and a real project is a thing
     to point a credential at. Twenty lowercase letters is the shape; a
     placeholder spelled `<project>` or `your-project` has a character it lacks. */
  [/\b(?!abcdefghijklmnopqrst\b)[a-z]{20}\.supabase\.co\b/g, 'a real Supabase project'],
  /* Credentials in a URL. Nothing else here catches them: the password is
     whatever somebody chose, so the only shape is the position. */
  [/\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/:@]+@/g, 'a password inside a URL'],
  [/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g, 'a private key'],
  /* The three credentials the wizard mints itself are 24 random bytes as
     base64url, and that shape is 32 characters of the same alphabet a digest,
     an id or a base64 fixture is written in - banning it outright would ban
     half the repository. What no other line has is the name in front of it, so
     the name is the rule: these three, an assignment, and a value long enough
     to be one. */
  [
    /\b(?:ADMIN_PASSWORD|PUBLISHING_SECRET|ADMIN_COOKIE_SALT)\s*[:=]\s*['"]?[A-Za-z0-9_-]{16,}/g,
    'a value assigned to one of the secrets this wizard mints',
  ],
];

/**
 * Every exception, in one place, so that granting one is a diff a reviewer sees.
 * A red gate is never cleared by quietly adding a line here.
 */
export const ALLOW: readonly { readonly path: RegExp; readonly pattern: RegExp }[] = [
  // The importer's own field ids and labels are English words that also happen
  // to be Spanish or Italian ones; the ban list above is matched case-insensitively.
  { path: /knowledge-base\/lib\/importMapping\.(ts|test\.ts)$/, pattern: /\bnome\b/i },
  // The CLI's own bundle names every package manager it can drive, pnpm
  // included - that is the feature. The ban is on telling the reader of a
  // scaffolded project to run a command their project does not have.
  { path: /^(?:dist|bin)\//, pattern: /\bpnpm\b/ },
  /* The same feature, one directory on: the app's codegen installer hands the
     install to whichever package manager wrote the app's lockfile, and it has
     to name them to detect them. The wizard drives pnpm itself when the machine
     has it, so a scaffolded project using it is the ordinary case — what the
     ban is for is prose telling that reader to run a command they do not have. */
  { path: /^content\/shell\/scripts\/codegen\.mjs$/, pattern: /\bpnpm\b/ },
  /* The log scrubber's tests need secret-shaped input to prove secrets are redacted.
     The JWT is no longer waived: the test builds one out of base64url and random bytes,
     so no `eyJ...` literal is in the tree to waive. The personal-access-token
     placeholder is all zeros and opens nothing. */
  { path: /^packages\/wizard\/test\/log\.test\.ts$/, pattern: /\bsbp_0{20}\b/ },
  /* The wizard's own suites need well-formed Supabase tokens to drive the code
     that reads them. The widened `sbp_` rule above sees those too, so the
     waiver is scoped to the test tree AND to the shape a real token cannot
     have: the word "token" spelled out, then nothing but zeros. A leaked one
     is random, and random does not spell anything. */
  { path: /^packages\/wizard\/test\//, pattern: /\bsbp_[a-z]*token0*\b/ },
  /* A test that names the file it could not read needs a path to name, and an
     absolute one - that is what the message is for. The waiver is on the shape
     of an invented owner: a home directory belonging to `someone`. A path
     carrying a real username still fails, in a test as anywhere else. */
  { path: /^packages\/wizard\/test\//, pattern: /\/home\/someone\// },
  /* The loopback guard is tested against something that is not loopback, and
     10.0.0.1 is the address everyone reaches for to mean exactly that. Scoped
     to the one file, and to the one address. */
  { path: /^content\/api-client\/test\/url-guard\.test\.ts$/, pattern: /\b10\.0\.0\.1\b/ },
  // The live check proves the Supabase API rejects a bad credential, which
  // takes a well-formed bad credential: a deliberately bogus all-zeros token.
  { path: /^packages\/wizard\/scripts\/live-check-supabase\.ts$/, pattern: /\bsbp_0{40}\b/ },
  /* A fixture that proves an upstream name is scrubbed needs an upstream name to
     scrub, and `upstream` - the one word the rule spares - is what the scrubber
     replaces it with, so it cannot be the input. The waiver is on the shape of an
     invented one: `svc-` and then anything. A real service name in a test still
     fails, which is the case worth catching. */
  {
    path: /\.test\.tsx?$/,
    pattern: /\bSubgraph\s+'svc-[a-z0-9]+'|\bservice(?:Name)?\s*:\s*'svc-[a-z0-9]+'/,
  },
  /* The suites that drive the admin and publishing paths need a password of
     the right length to drive them with. The waiver is scoped to the test tree
     AND to the shape a minted one cannot have: lowercase words and hyphens,
     nothing else. A generated secret has a digit or a capital in it within the
     first few characters, so a real one pasted into a test still fails. */
  {
    path: /\.test\.tsx?$/,
    pattern: /\b(?:ADMIN_PASSWORD|PUBLISHING_SECRET|ADMIN_COOKIE_SALT)\s*[:=]\s*'[a-z-]{16,}'/,
  },
  /* Credentials in a URL, in the files whose whole subject is hiding them: a
     proxy variable printed back to the operator, a catalog URL echoed by a failed
     clone, a mirror origin the scrubber is asked to mask. The password in each is
     invented and the assertion beside it is that the string never reaches a
     terminal - so the shape has to appear, or nothing is being tested. */
  {
    path: /(?:egress|net|tokenHint|contentOrigin|deployVercel|fetch)(?:\.test)?\.(?:mjs|ts)$/,
    pattern: /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/:@]+@/,
  },
  // Pinning a GitHub Action to a full commit SHA is the supply-chain-safe way
  // to pin it, not a provenance leak - so the commit-hash rule is waived in the
  // workflow directory, where every such hash is a deliberate `uses: …@<sha>`.
  { path: /^\.github\/workflows\//, pattern: /@[0-9a-f]{7,40}\b/ },
];
