import { Resolver, ResolveOptions, LinkType, IdentHash } from "@yarnpkg/core";
import { Descriptor, Locator, Package } from "@yarnpkg/core";

import * as conditionUtils from "./conditionUtils";
import { assertKnownCondition, getDefaultTestValue } from "./configuration";

export class ConditionResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor) {
    return conditionUtils.hasConditionProtocol(descriptor.range);
  }

  supportsLocator(locator: Locator) {
    return conditionUtils.hasConditionProtocol(locator.reference);
  }

  shouldPersistResolution() {
    return false;
  }

  bindDescriptor(descriptor: Descriptor): Descriptor {
    return descriptor;
  }

  getResolutionDependencies(descriptor: Descriptor): Descriptor[] {
    const { test, consequent, alternate } = conditionUtils.parseDescriptor(
      descriptor
    );
    return [
      conditionUtils.makeVirtualDescriptor(
        test,
        true,
        descriptor.name,
        consequent
      ),
      conditionUtils.makeVirtualDescriptor(
        test,
        false,
        descriptor.name,
        alternate
      ),
    ].filter(Boolean);
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: unknown,
    opts: ResolveOptions
  ): Promise<Locator[]> {
    const { test, consequent, alternate } = conditionUtils.parseDescriptor(
      descriptor
    );
    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      getDefaultTestValue(opts.project, test)
    );

    return [
      conditionUtils.makeLocator(descriptor, {
        test,
        consequent,
        alternate,
        hash,
      }),
    ];
  }

  async getSatisfying() {
    return null;
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const { test, consequent, alternate } = conditionUtils.parseLocator(
      locator
    );

    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      getDefaultTestValue(opts.project, test)
    );

    const descTrue = conditionUtils.makeVirtualDescriptor(
      test,
      true,
      locator.name,
      consequent
    );
    const descFalse = conditionUtils.makeVirtualDescriptor(
      test,
      false,
      locator.name,
      alternate
    );

    return {
      ...locator,
      version: `0.0.0-condition-${hash}`,
      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.HARD,
      dependencies: new Map(
        [
          descTrue && [descTrue.identHash, descTrue],
          descFalse && [descFalse.identHash, descFalse],
        ].filter(Boolean) as [IdentHash, Descriptor][]
      ),
      peerDependencies: new Map(),
      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),
      bin: null,
    };
  }
}
