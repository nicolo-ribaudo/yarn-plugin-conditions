import { structUtils, Workspace } from "@yarnpkg/core";

import * as conditionUtils from "./conditionUtils";
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
    const descs = workspace.manifest.getForScope(dependencyType).values();
    for (const descriptor of descs) {
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
      } else {
        delete rawManifest[dependencyType][ident];
      }
    }
  }
}
