// ---------------------------------------------------------------------------
// Pass 14 — the proxy's bot fence must see every argument of type BotID
// ---------------------------------------------------------------------------
// The fence recognises a bot argument by NAME (`botID`), which covers all but
// three fields in the schema; those three call it `id` and are listed by field
// in BOT_ID_ARGUMENT_BY_FIELD. A schema update that adds a fourth would pass
// every other gate silently, and the request naming that bot would reach
// upstream under the deployment's account-wide token. So the list is checked
// against the SDL here rather than trusted to a comment.
import { getNamedType, isInputObjectType, isObjectType, isScalarType } from 'graphql';
import {
  ACCOUNT_SCOPED_ID_ARGUMENTS,
  ACCOUNT_SCOPED_ID_TYPES,
  BOT_ID_ARGUMENTS,
  BOT_ID_ARGUMENT_BY_FIELD,
  RESOURCE_ID_ARGUMENTS,
} from '../../../content/vite-plugin-proxy/src/queryAnalysis.ts';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const BOT_ID_SCALAR = 'BotID';
const SOURCE = 'content/vite-plugin-proxy/src/queryAnalysis.ts';

export function checkBotFence(ctx: ValidateContext): void {
  const inSchema = new Map<string, string>();
  for (const type of Object.values(ctx.schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    if (isInputObjectType(type)) {
      // An input field carries no field context the map could key on, so one
      // named anything but `botID` is a gap this design cannot express.
      for (const field of Object.values(type.getFields())) {
        if (getNamedType(field.type).name !== BOT_ID_SCALAR) continue;
        if (BOT_ID_ARGUMENTS.has(field.name)) continue;
        fail(
          `${type.name}.${field.name} is a ${BOT_ID_SCALAR} inside an input object under a name the fence ` +
            `does not know — ${SOURCE} matches input-object fields by name only, so this one needs a new mechanism`,
        );
      }
      continue;
    }
    if (!isObjectType(type)) continue;
    for (const field of Object.values(type.getFields())) {
      for (const arg of field.args) {
        if (getNamedType(arg.type).name !== BOT_ID_SCALAR) continue;
        if (BOT_ID_ARGUMENTS.has(arg.name)) continue;
        inSchema.set(field.name, arg.name);
      }
    }
  }

  for (const [field, arg] of inSchema) {
    const declared = BOT_ID_ARGUMENT_BY_FIELD.get(field);
    if (declared === arg) continue;
    fail(
      declared === undefined
        ? `${field}(${arg}:) takes a ${BOT_ID_SCALAR} the fence cannot see — add ['${field}', '${arg}'] to ` +
            `BOT_ID_ARGUMENT_BY_FIELD in ${SOURCE}`
        : `${field} names its bot '${arg}' in the schema but '${declared}' in BOT_ID_ARGUMENT_BY_FIELD (${SOURCE})`,
    );
  }
  for (const field of BOT_ID_ARGUMENT_BY_FIELD.keys()) {
    if (!inSchema.has(field)) {
      fail(`BOT_ID_ARGUMENT_BY_FIELD lists ${field}, which no longer takes a ${BOT_ID_SCALAR} — drop it (${SOURCE})`);
    }
  }
}

/**
 * The resource fence's other half: an argument that carries an ACCOUNT-scoped
 * id — the deployer's own user, their workspace — must not be read as a
 * resource. One that is would be bound to whichever tenant read it first and
 * refused for every other tenant afterwards, which is a self-inflicted outage
 * rather than a leak. So the exclusion list is checked against the SDL too.
 *
 * `id` is exempt: a bare `id` is a resource on most fields, and the two fields
 * where it is not are resolved by the field they sit on (see the comment on
 * ACCOUNT_SCOPED_ID_ARGUMENTS).
 */
export function checkResourceFence(ctx: ValidateContext): void {
  const inSchema = new Set<string>();
  for (const type of Object.values(ctx.schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (ACCOUNT_SCOPED_ID_TYPES.has(getNamedType(field.type).name)) inSchema.add(field.name);
      }
      continue;
    }
    if (!isObjectType(type)) continue;
    for (const field of Object.values(type.getFields())) {
      for (const arg of field.args) {
        if (ACCOUNT_SCOPED_ID_TYPES.has(getNamedType(arg.type).name)) inSchema.add(arg.name);
      }
    }
  }
  inSchema.delete('id');

  for (const name of inSchema) {
    if (ACCOUNT_SCOPED_ID_ARGUMENTS.has(name)) continue;
    fail(
      `${name} carries an account-scoped id in the schema but the resource fence reads it as a resource — ` +
        `add '${name}' to ACCOUNT_SCOPED_ID_ARGUMENTS in ${SOURCE}`,
    );
  }
  for (const name of ACCOUNT_SCOPED_ID_ARGUMENTS) {
    // The bot-id spellings are the bot fence's own list, kept whether or not
    // the schema still writes them both — dropping one here would be dropping
    // it from the fence.
    if (BOT_ID_ARGUMENTS.has(name)) continue;
    if (!inSchema.has(name)) {
      fail(
        `ACCOUNT_SCOPED_ID_ARGUMENTS lists ${name}, which no longer carries an account-scoped id — drop it (${SOURCE})`,
      );
    }
  }
}

/**
 * The resource fence's third direction: a bot-scoped id must not slip past it
 * because of what its argument is CALLED.
 *
 * The fence reads an argument as a handle when the name looks like one — `id`,
 * or a name ending in `ID`/`IDs`. Bot scope, though, is carried by the TYPE,
 * and the schema regularly writes one under a name that says nothing:
 * `attachment: FileID`, `images: [FileID]`, `before: MessageID`. Each of those
 * is another tenant's handle, and a request naming one reached upstream with
 * the fence never consulted — not narrowed, disabled, because the fence is
 * only asked when a request names at least one resource.
 *
 * Neither of the two passes above sees this: the first looks for `BotID`, the
 * second for the account-scoped types. So the exception list is checked
 * against the SDL here, and a schema update that adds a name fails the build
 * instead of quietly widening what the proxy forwards.
 */
export function checkResourceIdNames(ctx: ValidateContext): void {
  const idScalars = new Set(
    Object.values(ctx.schema.getTypeMap())
      .filter((type) => isScalarType(type) && !type.name.startsWith('__') && type.name.endsWith('ID'))
      .map((type) => type.name),
  );

  const inSchema = new Map<string, string>();
  const consider = (argument: string, type: string, where: string): void => {
    if (!idScalars.has(type) || ACCOUNT_SCOPED_ID_TYPES.has(type)) return;
    if (argument === 'id' || /(ID|Id)s?$/.test(argument)) return;
    if (!inSchema.has(argument)) inSchema.set(argument, `${where} (${type})`);
  };

  for (const type of Object.values(ctx.schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        consider(field.name, getNamedType(field.type).name, `${type.name}.${field.name}`);
      }
      continue;
    }
    if (!isObjectType(type)) continue;
    for (const field of Object.values(type.getFields())) {
      for (const arg of field.args) {
        consider(arg.name, getNamedType(arg.type).name, `${field.name}(${arg.name}:)`);
      }
    }
  }

  for (const [argument, where] of inSchema) {
    if (RESOURCE_ID_ARGUMENTS.has(argument)) continue;
    fail(
      `${where} carries a bot-scoped id under a name the resource fence does not read as one — ` +
        `add '${argument}' to RESOURCE_ID_ARGUMENTS in ${SOURCE}`,
    );
  }
  for (const argument of RESOURCE_ID_ARGUMENTS) {
    if (!inSchema.has(argument)) {
      fail(`RESOURCE_ID_ARGUMENTS lists ${argument}, which no longer carries a bot-scoped id — drop it (${SOURCE})`);
    }
  }
}
