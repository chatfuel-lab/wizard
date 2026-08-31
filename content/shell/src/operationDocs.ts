// @chatfuel:operation-docs — the wizard regenerates this file with the selected
// modules at scaffold time. In-repo it lists every generated namespace, and the
// paths are the repository's; a scaffolded app's are './vendor/api/...'.
//
// This is the app's operation surface. The proxy walks these namespaces at
// startup, takes every value that carries an operation, and refuses a request
// whose document is not one of them — so a module missing from this list is a
// module whose requests are refused, loudly, on the first one.
//
// Namespace imports and not `export *`: contacts and livechat both export
// `FileInfoFragmentDoc`, and a star-reexport of both would make that name
// ambiguous and drop it with no error from tsc and none at runtime.
import * as adsOptimization from '../../api-client/src/generated/ads-optimization/graphql.js';
import * as automations from '../../api-client/src/generated/automations/graphql.js';
import * as bookings from '../../api-client/src/generated/bookings/graphql.js';
import * as contacts from '../../api-client/src/generated/contacts/graphql.js';
import * as core from '../../api-client/src/generated/core/graphql.js';
import * as coworker from '../../api-client/src/generated/coworker/graphql.js';
import * as deals from '../../api-client/src/generated/deals/graphql.js';
import * as flowBuilder from '../../api-client/src/generated/flow-builder/graphql.js';
import * as knowledgeBase from '../../api-client/src/generated/knowledge-base/graphql.js';
import * as livechat from '../../api-client/src/generated/livechat/graphql.js';
import * as publishing from '../../api-client/src/generated/publishing/graphql.js';

export const operations = [
  adsOptimization,
  automations,
  bookings,
  contacts,
  core,
  coworker,
  deals,
  flowBuilder,
  knowledgeBase,
  livechat,
  publishing,
];
