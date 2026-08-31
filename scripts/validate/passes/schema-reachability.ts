// ---------------------------------------------------------------------------
// Pass 4c — every declaration in the SDL must be reachable from a root
// ---------------------------------------------------------------------------
// The SDL is a subset: it is cut from a larger schema by deleting what is not part of
// the published API. Deletion is one-way — it removes what it names — so removing the
// one field that led into a subtree leaves the subtree behind, fully declared and
// enterable by no operation anyone can write.
//
// That is not a tidiness problem. This file is the whole of what the repo says the
// API is: codegen reads it, every scaffolded app vendors it, and the core skill hands
// it to an agent as the map of the surface. A declaration nothing can reach is a
// feature described here that nothing can call — the shape of an unpublished surface
// left in by accident, and the shape it has left in twice.
//
// So the check is the walk itself: from Query, Mutation and Subscription, through
// field and argument types, input-object fields, union members, and both directions
// of the abstract relation — the interfaces a type implements, and every implementor
// of a reachable interface, because the API can return one and possible-types.json
// beside this file names it. Anything the walk never touches has no way in.
import {
  getNamedType,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import type { GraphQLNamedType, GraphQLSchema } from 'graphql';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

function reachableFromRoots(schema: GraphQLSchema): Set<string> {
  const seen = new Set<string>();
  const walk = (type: GraphQLNamedType | null | undefined): void => {
    if (!type || seen.has(type.name)) return;
    seen.add(type.name);
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const iface of type.getInterfaces()) walk(iface);
      if (isInterfaceType(type)) {
        const { objects, interfaces } = schema.getImplementations(type);
        for (const impl of [...objects, ...interfaces]) walk(impl);
      }
      for (const field of Object.values(type.getFields())) {
        walk(getNamedType(field.type));
        for (const arg of field.args) walk(getNamedType(arg.type));
      }
    } else if (isUnionType(type)) {
      for (const member of type.getTypes()) walk(member);
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) walk(getNamedType(field.type));
    }
  };
  walk(schema.getQueryType());
  walk(schema.getMutationType());
  walk(schema.getSubscriptionType());
  // A type an argument of a declared directive names is part of what this schema
  // publishes too, whatever the roots can see.
  for (const directive of schema.getDirectives()) for (const arg of directive.args) walk(getNamedType(arg.type));
  return seen;
}

export function checkSchemaReachability(ctx: ValidateContext): void {
  const reachable = reachableFromRoots(ctx.schema);
  const orphans = Object.values(ctx.schema.getTypeMap())
    .filter((type) => !isIntrospectionType(type) && !isSpecifiedScalarType(type))
    .filter((type) => !reachable.has(type.name))
    .map((type) => type.name)
    .sort();
  if (orphans.length === 0) return;
  fail(
    `content/schema/schema.graphql declares ${orphans.length} types no operation can reach from ` +
      `Query, Mutation or Subscription:\n    ${orphans.join(' ')}\n  ` +
      `Each is a surface this repo publishes and nothing can call. They are what is left when a ` +
      `root field is trimmed away and the subtree behind it is not, so the fix belongs where the ` +
      `SDL is generated, not here: regenerate it and commit the result.`,
  );
}
