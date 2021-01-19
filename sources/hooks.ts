import { structUtils, Workspace } from "@yarnpkg/core";

import * as conditionUtils from "./ConditionProtocol/utils";
import { evaluateTest } from "./configuration";

const DEPENDENCY_TYPES = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
];

export function beforeWorkspacePacking(
  workspace: Workspace,
  rawManifest: object
) {
  const { project } = workspace;

  for (const dependencyType of DEPENDENCY_TYPES) {
    const descs = workspace.manifest.getForScope(dependencyType);
    for (const [hash, descriptor] of descs) {
      if (!conditionUtils.hasConditionProtocol(descriptor.range)) {
        continue;
      }

      const { test, consequent, alternate } = conditionUtils.parseDescriptor(
        descriptor
      );

      const version = evaluateTest(project, test) ? consequent : alternate;
      const ident = structUtils.stringifyIdent(descriptor);

      if (version) {
        rawManifest[dependencyType][ident] = version;
        descriptor.range = version;
      } else {
        delete rawManifest[dependencyType][ident];
        descs.delete(hash);
      }
    }
  }
}
