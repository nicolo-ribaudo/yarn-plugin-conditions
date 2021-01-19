import { Fetcher, FetchOptions } from "@yarnpkg/core";
import { Locator } from "@yarnpkg/core";
import { structUtils } from "@yarnpkg/core";
import { createSimplePackage } from "../zipUtils";

import * as conditionProxyUtils from "./utils";
import * as identUtils from "../identUtils";

export class ConditionProxyFetcher implements Fetcher {
  supports(locator: Locator) {
    return conditionProxyUtils.isConditionProxy(locator.reference);
  }

  getLocalPath() {
    return null;
  }

  async fetch(locator: Locator, opts: FetchOptions) {
    const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;

    const [
      packageFs,
      releaseFs,
      checksum,
    ] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
      onHit: () => opts.report.reportCacheHit(locator),
      onMiss: () =>
        opts.report.reportCacheMiss(
          locator,
          `${structUtils.prettyLocator(
            opts.project.configuration,
            locator
          )} can't be found in the cache and will be fetched from the disk`
        ),
      loader: () => this.generateConditionProxyPackage(locator, opts),

      skipIntegrityCheck: opts.skipIntegrityCheck,
    });

    return {
      packageFs,
      releaseFs,
      prefixPath: structUtils.getIdentVendorPath(locator),
      localPath: this.getLocalPath(),
      checksum,
    };
  }

  private async generateConditionProxyPackage(
    locator: Locator,
    opts: FetchOptions
  ) {
    const { scope, name, range } = conditionProxyUtils.parseLocator(locator);
    const hash = conditionProxyUtils.makeHash(scope, name, range);

    const depname = identUtils.name(structUtils.makeIdent(scope, name));

    return createSimplePackage(
      locator,
      opts.project,
      {
        version: `0.0.0-condition-proxy-${hash}`,
        dependencies: { [depname]: range },
      },
      `module.exports = require(${JSON.stringify(depname)})`
    );
  }
}
