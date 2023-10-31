import {
  Resolver,
  ResolveOptions,
  LinkType,
  IdentHash,
  MinimalResolveOptions,
  structUtils,
} from "@yarnpkg/core";
import { Descriptor, Locator, Package } from "@yarnpkg/core";

import * as conditionUtils from "../conditionUtils";
import { getDefaultTestValue } from "../configuration";

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

  getResolutionDependencies(
    descriptor: Descriptor,
    opts: MinimalResolveOptions
  ): Record<string, Descriptor> {
    const { test, consequent, alternate } = conditionUtils.parseDescriptor(
      descriptor
    );
    const result: Record<string, Descriptor> = {};
    if (consequent) {
      result.consequent = conditionUtils.makeQualifiedDescriptor(
        opts.project,
        descriptor,
        test,
        consequent,
        true
      );
    }
    if (alternate) {
      result.alternate = conditionUtils.makeQualifiedDescriptor(
        opts.project,
        descriptor,
        test,
        alternate,
        false
      )
    }
    return result;
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: unknown,
    opts: ResolveOptions
  ): Promise<Locator[]> {
    const { test, consequent, alternate, esmExports, peers } = conditionUtils.parseDescriptor(
      descriptor
    );
    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      esmExports,
      peers,
      getDefaultTestValue(opts.project, test)
    );

    return [
      conditionUtils.makeLocator(descriptor, {
        test,
        consequent,
        alternate,
        esmExports,
        peers,
        hash,
      }),
    ];
  }

  async getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Array<Locator>, opts: ResolveOptions) {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts);

    return {
      locators: locators.filter(candidate => candidate.locatorHash === locator.locatorHash),
      sorted: false,
    };
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const { test, consequent, alternate, esmExports, peers } = conditionUtils.parseLocator(
      locator
    );

    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      esmExports,
      peers,
      getDefaultTestValue(opts.project, test)
    );

    const consequentDesc =
      consequent &&
      conditionUtils.makeQualifiedDescriptor(
        opts.project,
        locator,
        test,
        consequent,
        true
      );
    const alternateDesc =
      alternate &&
      conditionUtils.makeQualifiedDescriptor(
        opts.project,
        locator,
        test,
        alternate,
        false
      );

    return {
      ...locator,
      version: `0.0.0-condition-${hash}`,
      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.HARD,
      dependencies: new Map(
        [
          consequent && [consequentDesc.identHash, consequentDesc],
          alternate && [alternateDesc.identHash, alternateDesc],
        ].filter(Boolean) as [IdentHash, Descriptor][]
      ),
      peerDependencies: new Map(
        (peers || []).map(peer => {
          const desc = structUtils.parseDescriptor(`${peer}@*`);
          return [desc.identHash, desc];
        })
      ),
      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),
      bin: null,
    };
  }
}
