import { structUtils, Workspace } from "@yarnpkg/core";

import * as conditionUtils from "./conditionUtils";
import { evaluateCondition } from "./configuration";
import { DEPENDENCY_TYPES } from "./constants";

export function beforeWorkspacePacking(
  workspace: Workspace,
  rawManifest: object
) {
  const { project } = workspace;

  for (const dependencyType of DEPENDENCY_TYPES) {
    const descs = workspace.manifest.getForScope(dependencyType).values();
    for (const descriptor of descs) {
      if (!conditionUtils.hasConditionProtocol(descriptor.range)) {
        continue;
      }

      const { test, consequent, alternate } = conditionUtils.parseDescriptor(
        descriptor
      );

      const version = evaluateCondition(project, test) ? consequent : alternate;
      const ident = structUtils.stringifyIdent(descriptor);

      // optionalDependencies are considered normal dependencies by the
      // yarn API, but they are in a different filed in package.json
      const thisDepType =
        dependencyType === "dependencies" &&
        !rawManifest["dependencies"][ident] &&
        rawManifest["optionalDependencies"]?.[ident]
          ? "optionalDependencies"
          : dependencyType;

      if (version) {
        rawManifest[thisDepType][ident] = version;
      } else {
        delete rawManifest[thisDepType][ident];
      }
    }
  }
}
