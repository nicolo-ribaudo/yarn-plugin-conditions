import { Ident } from "@yarnpkg/core";

export function name(ident: Ident | { name: string; scope: string }): string {
  if (ident.scope) return `@${ident.scope}/${ident.name}`;
  return ident.name;
}
