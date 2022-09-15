import {
  Project,
  structUtils,
  Configuration,
  Cache,
  Workspace,
  StreamReport,
} from "@yarnpkg/core";
import { BaseCommand } from "@yarnpkg/cli";
import { Command, Option, Usage } from "clipanion";
import * as t from "typanion-custom";

import { assertKnownCondition, evaluateCondition } from "../configuration";
import { DEPENDENCY_TYPES } from "../constants";
import * as conditionUtils from "../conditionUtils";

const has = Function.call.bind(Object.prototype.hasOwnProperty);
const hasDeep = (obj: object, prop: string, ...next: string[]) =>
  has(obj, prop) &&
  (next.length === 0 || hasDeep(obj[prop], ...(next as [string, ...string[]])));

export class MaterlializeCommand extends BaseCommand {
  static paths = [["condition", "materialize"]];

  static usage: Usage = Command.Usage({
    description: "Evaluate and replace a condition in package.json files",
    details: `
      This command will replace all the occurrences of \`<condition>\` in the current workspace and in nested workspaces.

      The value of the condition (\`true\` or \`false\`) is based on the following sources, in descending priority order:

      - the \`--true\` or \`--false\` option;
      - the \`<condition>\` environment variable;
      - the default value specified in the Yarn configuration;
      - \`false\` by default.
    `,
  });

  condition: string = Option.String({ required: true });

  true: boolean = Option.Boolean("--true", false);

  false: boolean = Option.Boolean("--false", false);

  static schema = [
    t.hasMutuallyExclusiveKeys(["true", "false"], { missingIf: "falsy" }),
  ];

  async execute() {
    const { project, workspace, cache, configuration } = await this.getRoot();

    assertKnownCondition(project, this.condition);

    const value = this.false
      ? false
      : this.true
      ? true
      : evaluateCondition(project, this.condition);

    for (const ws of this.nestedWorkspaces(workspace, project)) {
      this.materializeCondition(value, ws);
    }

    const report = await StreamReport.start(
      { configuration, stdout: this.context.stdout, includeLogs: true },
      async (report: StreamReport) => {
        await project.resolveEverything({ cache, report });
      }
    );
    if (report.hasErrors()) {
      return report.exitCode();
    }

    await project.persist();
  }

  private *nestedWorkspaces(
    workspace: Workspace,
    project: Project
  ): Generator<Workspace> {
    yield workspace;

    for (const childCwd of workspace.workspacesCwds) {
      const childWorkspace = project.workspacesByCwd.get(childCwd);
      if (childWorkspace) yield* this.nestedWorkspaces(childWorkspace, project);
    }
  }

  private materializeCondition(value: boolean, workspace: Workspace) {
    for (const dependencyType of DEPENDENCY_TYPES) {
      const descs = workspace.manifest.getForScope(dependencyType).values();
      for (const descriptor of descs) {
        if (!conditionUtils.hasConditionProtocol(descriptor.range)) {
          continue;
        }

        const { test, consequent, alternate } =
          conditionUtils.parseDescriptor(descriptor);

        if (test !== this.condition) continue;

        const range = value ? consequent : alternate;

        if (range) {
          workspace.manifest[dependencyType].set(
            descriptor.identHash,
            structUtils.makeDescriptor(descriptor, range)
          );
        } else {
          workspace.manifest[dependencyType].delete(descriptor.identHash);
        }
      }
    }

    const rawManifest = workspace.manifest.raw;
    if (hasDeep(rawManifest, "conditions", this.condition)) {
      const [consequent, alternate] = rawManifest["conditions"][this.condition];
      const props = value ? consequent : alternate;
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          if (value === null) delete rawManifest[key];
          else rawManifest[key] = value;
        }
      }

      if (Object.keys(rawManifest["conditions"]).length === 1) {
        delete rawManifest["conditions"];
      } else {
        delete rawManifest["conditions"][this.condition];
      }
    }
  }

  private async getRoot() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    const [{ project, workspace }, cache] = await Promise.all([
      Project.find(configuration, this.context.cwd),
      Cache.find(configuration, { immutable: true }),
    ]);

    return { configuration, project, workspace, cache };
  }
}
