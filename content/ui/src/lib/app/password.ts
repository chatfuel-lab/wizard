/**
 * Password strength, as the sign-up form's meter reads it.
 *
 * Deliberately a heuristic and not an entropy estimator: the meter is a nudge
 * ("longer, and mix it up"), not a security boundary — the server decides what
 * it accepts. Two things it does insist on, because both are what a real
 * checker would fail first: eight characters before anything counts as more
 * than weak, and a handful of the passwords everybody types before thinking.
 *
 * Length is weighted over character variety on purpose. A 20-character
 * passphrase of lowercase words is a good password; a 6-character
 * everything-mixed one is not, and a meter that said otherwise would be
 * teaching the wrong lesson.
 */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

/** Nothing exhaustive — the point is that "password" never lights three segments. */
const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'letmein1',
  'admin123',
  'welcome1',
  'sunshine',
  'football',
  'baseball',
  'princess',
  'dragon12',
]);

/**
 * 0 — nothing typed. 1 — weak: under eight characters, a common password, or
 * hardly any distinct characters. 2..4 — fair, good, strong: length first, then
 * how many character classes are mixed in.
 */
export function scorePassword(value: string): PasswordScore {
  const length = value.length;
  if (length === 0) return 0;

  const distinct = new Set(value).size;
  if (length < 8 || distinct < 4 || COMMON.has(value.toLowerCase())) return 1;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;

  let points = 1;
  if (classes >= 2) points += 1;
  if ((classes >= 3 && length >= 10) || length >= 14) points += 1;
  if ((classes >= 3 && length >= 12) || length >= 20) points += 1;
  return Math.min(points, 4) as PasswordScore;
}

const LABELS: Record<PasswordScore, string> = {
  0: 'Too weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

/** The one word the meter says beside its segments. */
export function strengthLabel(score: PasswordScore): string {
  return LABELS[score];
}
