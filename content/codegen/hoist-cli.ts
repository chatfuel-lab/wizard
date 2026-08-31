/**
 * Command-line front for the hoisting pass.
 *
 *   node --import tsx <this file> <generated-dir>
 *
 * Both ends of the generator run the same pass over their own output — this
 * repository over `content/api-client/src/generated`, a scaffolded app over
 * `src/vendor/api/generated` — so the directory is an argument rather than a
 * constant. Running it twice over the same files changes nothing.
 */
import { formatHoistReport, hoistDirectory } from './hoist.ts';

const [generatedDir] = process.argv.slice(2);
if (!generatedDir) {
  console.error('usage: hoist-cli.ts <generated-dir>');
  process.exit(2);
}

console.log(formatHoistReport(hoistDirectory(generatedDir)));
