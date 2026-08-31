/**
 * How every step reports: aligned status lines on stdout, a STOPPED message on
 * stderr, and one question when there is a terminal to ask it on.
 */
import { createInterface } from 'node:readline/promises';

/** @param {string} line */
export const ok = (line) => console.log(`  ok   ${line}`);
/** @param {string} line */
export const info = (line) => console.log(`       ${line}`);
/** @param {string} line */
export const warn = (line) => console.log(`  warn ${line}`);

/**
 * Print the reason, then stop. No stack trace — none of these are our bugs.
 *
 * @param {string} message
 * @param {string} [hint]
 * @returns {never}
 */
export function fail(message, hint) {
  console.error(`\n  STOPPED: ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

/**
 * One line from the terminal, or the default when there is no terminal.
 *
 * @param {string} question
 * @param {string} fallback
 * @returns {Promise<string>}
 */
export async function ask(question, fallback) {
  if (!process.stdin.isTTY) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer === '' ? fallback : answer;
  } finally {
    rl.close();
  }
}
