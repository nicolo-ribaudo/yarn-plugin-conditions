import {
  Descriptor,
  hashUtils,
  Ident,
  Locator,
  structUtils,
} from "@yarnpkg/core";

import { CACHE_VERSION } from "../constants";
import * as identUtils from "../identUtils";

const PROTOCOL = "condition_proxy_internal:";

export function isConditionProxy(range: string) {
  return range.startsWith(PROTOCOL);
}

function parse(range: string) {
  const separatorIndex = range.indexOf(":", PROTOCOL.length);

  let scope = "";
  let name = range.slice(PROTOCOL.length, separatorIndex);
  if (name.startsWith("@")) {
    [scope, name] = name.slice(1).split("/");
  }

  return {
    name,
    scope,
    range: range.slice(separatorIndex + 1),
  };
}

export function parseDescriptor(descriptor: Descriptor) {
  return parse(descriptor.range);
}

export function parseLocator(locator: Locator) {
  return parse(locator.reference);
}

export function makeVirtualDescriptor(
  condition: string,
  test: boolean,
  scope: string,
  name: string,
  range: string | null
): Descriptor | null {
  if (!range) return null;

  return structUtils.makeDescriptor(
    structUtils.makeIdent(scope, `${name}-${condition}-${test}`),
    makeSpec({ scope, name, range })
  );
}

function makeSpec({
  scope,
  name,
  range,
}: {
  scope: string;
  name: string;
  range: string;
}) {
  return `${PROTOCOL}${identUtils.name({ name, scope })}:${range}`;
}

export function makeLocator(
  ident: Ident,
  { scope, name, range }: ReturnType<typeof parseLocator>
) {
  return structUtils.makeLocator(ident, makeSpec({ scope, name, range }));
}

export function makeHash(scope: string, name: string, range: string) {
  return hashUtils
    .makeHash(String(CACHE_VERSION), scope, name, range)
    .slice(0, 6);
}
