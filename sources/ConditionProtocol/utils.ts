import {
  structUtils,
  Locator,
  Descriptor,
  Ident,
  hashUtils,
} from "@yarnpkg/core";

import { parse } from "./conditionParser";
import { CACHE_VERSION } from "../constants";

const PROTOCOL = "condition:";

export function hasConditionProtocol(range: string) {
  return range.startsWith(PROTOCOL);
}

export function parseDescriptor(descriptor: Descriptor) {
  return parse(descriptor.range);
}

export function parseLocator(locator: Locator) {
  return parse(locator.reference);
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
  let c = consequent || "";
  let a = alternate || "";
  if (c && /[:\?#]/.test(c)) c = `(${c})`;
  if (a && /[:\?#]/.test(a)) a = `(${a})`;

  return `condition:${test}?${c}:${a}#${hash || ""}`;
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
    makeSpec({ test, consequent, alternate, hash })
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
