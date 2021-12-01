import { Hooks, structUtils, Workspace } from "@yarnpkg/core";

import * as conditionUtils from "./conditionUtils";
import { evaluateCondition } from "./configuration";
import { DEPENDENCY_TYPES } from "./constants";

const has = Function.call.bind(Object.prototype.hasOwnProperty);

export async function beforeWorkspacePacking(
  workspace: Workspace,
  rawManifest: object
) {
  const { project } = workspace;

  let updated = false;

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
        workspace.manifest.raw[thisDepType][ident] = version;
        workspace.manifest[dependencyType].set(
          descriptor.identHash,
          structUtils.makeDescriptor(descriptor, version)
        );
      } else {
        delete rawManifest[thisDepType][ident];
        delete workspace.manifest.raw[thisDepType][ident];
        workspace.manifest[dependencyType].delete(descriptor.identHash);
      }

      updated = true;
    }
  }

  if (has(rawManifest, "conditions")) {
    updated = true;

    const conditions = rawManifest["conditions"] as conditionUtils.PkgConditions;
    for (const [test, [consequent, alternate]] of Object.entries(conditions)) {
      const props = evaluateCondition(project, test) ? consequent : alternate;
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          if (value === null) delete rawManifest[key];
          else rawManifest[key] = value;
        }
      }
    }

    delete rawManifest["conditions"];
  }

  if (updated) {
    await workspace.project.configuration.triggerHook(
      (hooks: Hooks) => (hooks as any).beforeWorkspacePacking,
      workspace,
      rawManifest
    );
  }
}
