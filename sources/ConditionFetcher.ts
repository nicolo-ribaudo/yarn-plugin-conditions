import { Fetcher, FetchOptions } from "@yarnpkg/core";
import { Locator } from "@yarnpkg/core";
import { structUtils } from "@yarnpkg/core";
import { Filename, ppath, xfs, ZipFS } from "@yarnpkg/fslib";
import { getLibzipPromise } from "@yarnpkg/libzip";

import * as conditionUtils from "./conditionUtils";
import { getDefaultTestValue } from "./configuration";

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

    const { name } = locator;
    const hash = conditionUtils.makeHash(
      test,
      consequent,
      alternate,
      defaultValue
    );

    const tmpDir = await xfs.mktempPromise();
    const tmpFile = ppath.join(tmpDir, "condition.zip" as Filename);
    const prefixPath = structUtils.getIdentVendorPath(locator);

    const libzip = await getLibzipPromise();

    const conditionPackage = new ZipFS(tmpFile, {
      libzip,
      create: true,
      level: opts.project.configuration.get(`compressionLevel`),
    });

    await conditionPackage.mkdirpPromise(prefixPath);

    await conditionPackage.writeJsonPromise(
      ppath.join(prefixPath, "package.json" as Filename),
      {
        version: `0.0.0-condition-${hash}`,
        dependencies: {
          [`${name}-${test}-true`]: consequent,
          [`${name}-${test}-false`]: alternate,
        },
      }
    );
    await conditionPackage.writeFilePromise(
      ppath.join(prefixPath, "index.js" as Filename),
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

    return conditionPackage;
  }
}
