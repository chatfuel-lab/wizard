#!/usr/bin/env node
'use strict';
/*
 * Deliberately tiny and deliberately old-syntax: this file is the only thing
 * that runs on a Node too old to parse dist/bin.js, and a parse error there
 * would be a stack trace instead of an instruction. Keep the floor in step
 * with MIN_NODE in src/node.ts.
 */
var MIN_NODE = '22.19.0';

function parts(version) {
  var out = [0, 0, 0];
  var read = String(version).split('.');
  for (var i = 0; i < 3; i++) out[i] = parseInt(read[i], 10) || 0;
  return out;
}

function supported(version) {
  var have = parts(version);
  var want = parts(MIN_NODE);
  for (var i = 0; i < 3; i++) {
    if (have[i] > want[i]) return true;
    if (have[i] < want[i]) return false;
  }
  return true;
}

if (!supported(process.versions.node)) {
  // Empty on Linux, and see src/node.ts for why: the line that was here piped a
  // URL into bash, which is not a habit this wizard is going to teach.
  var install =
    process.platform === 'darwin'
      ? 'brew install node'
      : process.platform === 'win32'
        ? 'winget install OpenJS.NodeJS.LTS'
        : '';
  console.error('');
  console.error('  The Chatfuel wizard needs Node ' + MIN_NODE + ' or newer.');
  console.error('  This computer has Node ' + process.versions.node + '.');
  console.error('');
  console.error('  Download the LTS installer:  https://nodejs.org/en/download');
  if (install) console.error('  Or from a terminal:          ' + install);
  console.error('');
  console.error('  Then run the wizard again — nothing else needs installing by hand.');
  console.error('');
  process.exit(1);
}

/*
 * The real CLI is ESM, and `import()` is syntax: a Node old enough to reject it
 * would fail to PARSE this file, so the message above would never be reached.
 * Building the call at runtime keeps the whole file ES5-parseable — by the time
 * it runs, the version is already known to be fine.
 */
var entry = require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'bin.js')).href;
var load = new Function('specifier', 'return import(specifier);');

load(entry).catch(function (err) {
  console.error(err);
  process.exit(1);
});
