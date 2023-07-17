import { Fetcher, FetchOptions } from "@yarnpkg/core";
import { Locator } from "@yarnpkg/core";
import { structUtils } from "@yarnpkg/core";

import * as conditionUtils from "../conditionUtils";
import { getDefaultTestValue } from "../configuration";
import { createSimplePackage } from "../zipUtils";

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
    const {
      test,
      consequent: consequentOpt,
      alternate: alternateOpt,
      esmExports: esmExportsOpt,
    } = conditionUtils.parseLocator(locator);
    const defaultValue = getDefaultTestValue(opts.project, test);

    const hash = conditionUtils.makeHash(
      test,
      consequentOpt,
      alternateOpt,
      esmExportsOpt,
      defaultValue
    );

    const prepare = (option, result) => {
      if (option == null) {
        return {
          dependency: null,
          require: `null`,
          esmHeader: ``,
          imported: `{ __proto__: null }`,
        };
      }

      const desc = conditionUtils.makeQualifiedDescriptor(
        opts.project,
        locator,
        test,
        option,
        result
      );

      const name = structUtils.stringifyIdent(desc);
      const varId = `if_${result}`;

      return {
        dependency: { [name]: desc.range },
        require: `require(${JSON.stringify(name)})`,
        esmHeader: `import * as ${varId} from ${JSON.stringify(name)};`,
        imported: varId,
      };
    };

    const consequent = prepare(consequentOpt, true);
    const alternate = prepare(alternateOpt, false);

    const packageJson = {
      version: `0.0.0-condition-${hash}`,
      dependencies: {
        ...consequent.dependency,
        ...alternate.dependency,
      },
      ...esmExportsOpt && {
        exports: {
          module: "./index.mjs",
          default: "./index.js"
        }
      }
    }

    const boolFn = `\
// env vars from the cli are always strings, so !!ENV_VAR returns true for "false"
function bool(value) {
  if (value == null) return ${defaultValue};
  return value && value !== "false" && value !== "0";
}
`;

    const indexJS = `\
${boolFn}
module.exports = bool(process.env[${JSON.stringify(test)}])
  ? ${consequent.require}
  : ${alternate.require};
`;

    let indexMJS = null;
    if (esmExportsOpt) {
      let hasDefault = false;
      const nonDefaultExports = [];
      for (const name of esmExportsOpt) {
        if (name === "default") {
          hasDefault = true;
        } else {
          nonDefaultExports.push(name);
        }
      }

      indexMJS = `\
${boolFn}
${consequent.esmHeader}
${alternate.esmHeader}

export const { ${ nonDefaultExports.join(", ")} } = bool(process.env[${JSON.stringify(test)}]) ? ${consequent.imported} : ${alternate.imported};
${hasDefault && `export default (bool(process.env[${JSON.stringify(test)}]) ? ${consequent.imported} : ${alternate.imported}).default;`}
`;
    }

    return createSimplePackage(
      locator,
      opts.project,
      packageJson,
      indexJS,
      indexMJS,
    );
  }
}
