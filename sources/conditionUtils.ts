import {
  structUtils,
  Locator,
  Descriptor,
  Ident,
  hashUtils,
} from "@yarnpkg/core";

// We must update this every time that the generated proxy dependency changes.
const CACHE_VERSION = 1;

export function hasConditionProtocol(range: string) {
  return range.startsWith("condition:");
}

function parseSpec<T>(spec: string) {
  const match = spec.match(
    /^condition:\s*(?<test>\w+)\s*\?\s*(?<consequent>[^\s:]*)\s*:\s*(?<alternate>[^\s:#]*)\s*(?:#(.*))?$/
  );

  let params;
  if (match !== null) {
    params = match.groups;
  } else {
    params = structUtils.parseRange(spec).params;
  }

  const { test, consequent, alternate } = params;

  return { test, consequent: consequent || null, alternate: alternate || null };
}

export function parseDescriptor(descriptor: Descriptor) {
  return parseSpec(descriptor.range);
}

export function parseLocator(locator: Locator) {
  return parseSpec(locator.reference);
}

export function makeVirtualDescriptor(
  condition: string,
  test: boolean,
  name: string,
  version: string | null
): Descriptor | null {
  if (!version) return null;
  const ident = structUtils.makeIdent("", `${name}-${condition}-${test}`);
  return structUtils.makeDescriptor(ident, `npm:${name}@${version}`);
}

function makeSpec({
  test,
  consequent,
  alternate,
  hash,
}: {
  test: string;
  consequent: string | null;
  alternate: string | null;
  hash: string | null;
}) {
  return `condition:${test}?${consequent || ""}:${alternate || ""}#${
    hash || ""
  }`;
}

export function makeDescriptor(
  ident: Ident,
  { test, consequent, alternate }: ReturnType<typeof parseDescriptor>
) {
  return structUtils.makeDescriptor(
    ident,
    makeSpec({ test, consequent, alternate, hash: null })
  );
}

export function makeLocator(
  ident: Ident,
  {
    test,
    consequent,
    alternate,
    hash,
  }: ReturnType<typeof parseLocator> & { hash: string }
) {
  return structUtils.makeLocator(
    ident,
    makeSpec({
      test,
      consequent,
      alternate,
      hash,
    })
  );
}

export function makeHash(
  test: string,
  consequent: string | null,
  alternate: string | null,
  defaultValue: boolean
) {
  return hashUtils
    .makeHash(
      String(CACHE_VERSION),
      test,
      consequent || "-",
      alternate || "-",
      defaultValue ? "1" : "0"
    )
    .slice(0, 6);
}
