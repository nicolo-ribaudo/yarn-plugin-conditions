import { Resolver, ResolveOptions, LinkType, structUtils } from "@yarnpkg/core";
import { Descriptor, Locator, Package } from "@yarnpkg/core";

import * as conditionProxyUtils from "./utils";

export class ConditionProxyResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor) {
    return conditionProxyUtils.isConditionProxy(descriptor.range);
  }

  supportsLocator(locator: Locator) {
    return conditionProxyUtils.isConditionProxy(locator.reference);
  }

  shouldPersistResolution() {
    return false;
  }

  bindDescriptor(descriptor: Descriptor): Descriptor {
    return descriptor;
  }

  getResolutionDependencies(descriptor: Descriptor): Descriptor[] {
    const { scope, name, range } = conditionProxyUtils.parseDescriptor(
      descriptor
    );
    return [
      structUtils.makeDescriptor(structUtils.makeIdent(scope, name), range),
    ];
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: unknown,
    opts: ResolveOptions
  ): Promise<Locator[]> {
    return [
      conditionProxyUtils.makeLocator(
        descriptor,
        conditionProxyUtils.parseDescriptor(descriptor)
      ),
    ];
  }

  async getSatisfying() {
    return null;
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const { scope, name, range } = conditionProxyUtils.parseLocator(locator);

    const hash = conditionProxyUtils.makeHash(scope, name, range);
    const desc = structUtils.makeDescriptor(
      structUtils.makeIdent(scope, name),
      range
    );

    console.log("PROXY DEP", desc);

    return {
      ...locator,
      version: `0.0.0-condition-proxy-${hash}`,
      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.HARD,
      dependencies: new Map([[desc.identHash, desc]]),
      peerDependencies: new Map(),
      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),
      bin: null,
    };
  }
}
