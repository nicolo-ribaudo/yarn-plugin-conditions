import {
  structUtils,
  Locator,
  Descriptor,
  Ident,
  hashUtils,
  Project,
} from "@yarnpkg/core";

import { parse } from "./conditionParser";

import { CACHE_VERSION } from "./constants";

export type PkgConditions = {
  [test: string]: [object | null, object | null];
}

export function hasConditionProtocol(range: string) {
  return range.startsWith("condition:");
}

export function parseSpec(
  spec: string
): { test: string; consequent: string | null; alternate: string | null; esmExports: string[] | null } {
  try {
    return parse(spec);
  } catch (e) {
    try {
      const { test, consequent, alternate, esmExports } = structUtils.parseRange(
        spec
      ).params;
      return {
        test,
        consequent: consequent || null,
        alternate: alternate || null,
        esmExports: esmExports || null,
      };
    } catch {
      throw e;
    }
  }
}

export function parseDescriptor(descriptor: Descriptor) {
  return parseSpec(descriptor.range);
}

export function parseLocator(locator: Locator) {
  return parseSpec(locator.reference);
}

function makeSpec({
  test,
  consequent,
  alternate,
  esmExports,
  hash,
}: {
  test: string;
  consequent: string | null;
  alternate: string | null;
  esmExports: string[] | null;
  hash: string | null;
}) {
  let spec = `condition:${test}?`;
  if (consequent) spec += consequent;
  spec += ":";
  if (alternate) spec += alternate;
  if (esmExports) spec += `(esm:${esmExports.join(",")})`;
  if (hash) spec += `#${hash}`;
  return spec;
}

export function makeDescriptor(
  ident: Ident,
  { test, consequent, alternate, esmExports }: ReturnType<typeof parseDescriptor>
) {
  return structUtils.makeDescriptor(
    ident,
    makeSpec({ test, consequent, alternate, esmExports, hash: null })
  );
}

export function makeLocator(
  ident: Ident,
  {
    test,
    consequent,
    alternate,
    esmExports,
    hash,
  }: ReturnType<typeof parseLocator> & { hash: string }
) {
  return structUtils.makeLocator(
    ident,
    makeSpec({ test, consequent, alternate, esmExports, hash })
  );
}

export function makeQualifiedDescriptor(
  project: Project,
  base: Ident,
  test: string,
  range: string,
  result: boolean
) {
  const ident = structUtils.makeIdent(
    base.scope,
    `${base.name}-${test}-${result}`
  );
  const qualifiedRange =
    project.configuration.get("defaultProtocol") +
    `${structUtils.stringifyIdent(base)}@${range}`;

  return structUtils.makeDescriptor(ident, qualifiedRange);
}

export function makeHash(
  test: string,
  consequent: string | null,
  alternate: string | null,
  esmExports: string[] | null,
  defaultValue: boolean
) {
  return hashUtils
    .makeHash(
      String(CACHE_VERSION),
      test,
      consequent || "-",
      alternate || "-",
      esmExports?.join(",") || "-",
      defaultValue ? "1" : "0"
    )
    .slice(0, 6);
}
