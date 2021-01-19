import { Fetcher, FetchOptions } from "@yarnpkg/core";
import { Locator } from "@yarnpkg/core";
import { structUtils } from "@yarnpkg/core";

import * as conditionUtils from "./utils";
import { getDefaultTestValue } from "../configuration";
import { createSimplePackage } from "../zipUtils";
import * as identUtils from "../identUtils";

// We always set the same mtime in generated zip archives, to keep the checksum static.
const mtime = 1580511600000;

export class ConditionFetcher implements Fetcher {
  supports(locator: Locator) {
    return conditionUtils.hasConditionProtocol(locator.reference);
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
      loader: () => this.generateConditionPackage(locator, opts),

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

  private async generateConditionPackage(locator: Locator, opts: FetchOptions) {
    const { test, consequent, alternate } = conditionUtils.parseLocator(
      locator
    );
    const defaultValue = getDefaultTestValue(opts.project, test);

    const name = identUtils.name(locator);
    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      defaultValue
    );

    return createSimplePackage(
      locator,
      opts.project,
      {
        version: `0.0.0-condition-${hash}`,
        dependencies: {
          [`${name}-${test}-true`]: consequent,
          [`${name}-${test}-false`]: alternate,
        },
      },
      `\
// env vars from the cli are always strings, so !!ENV_VAR returns true for "false"
function bool(value) {
  if (value == null) return ${defaultValue};
  return value && value !== "false" && value !== "0";
}

module.exports = bool(process.env[${JSON.stringify(test)}])
  ? require(${JSON.stringify(`${name}-${test}-true`)})
  : require(${JSON.stringify(`${name}-${test}-false`)});
`
    );
  }
}
