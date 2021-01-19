import {
  ConfigurationDefinitionMap,
  miscUtils,
  Project,
  SettingsType,
} from "@yarnpkg/core";

declare module "@yarnpkg/core" {
  interface ConfigurationValueMap {
    conditions: Map<
      string,
      miscUtils.ToMapValue<{ source: string | null; default: boolean | null }>
    >;
  }
}

export const configuration: Partial<ConfigurationDefinitionMap> = {
  conditions: {
    description: "",
    type: SettingsType.MAP,
    valueDefinition: {
      description: "",
      type: SettingsType.SHAPE,
      properties: {
        source: {
          description: "",
          type: SettingsType.STRING,
          default: "env",
        },
        default: {
          description: "",
          type: SettingsType.BOOLEAN,
          default: false,
        },
      },
    },
  },
};

export function assertKnownCondition(project: Project, test: string) {
  const config = project.configuration;

  if (!config.get("conditions").has(test)) {
    throw new Error(
      `Unknown condition: ${test}. You must add it to your .yarnrc.yml file.`
    );
  }
}

export function getDefaultTestValue(project: Project, test: string) {
  assertKnownCondition(project, test);
  return project.configuration.get("conditions").get(test).get("default");
}

export function evaluateTest(project: Project, test: string) {
  assertKnownCondition(project, test);
  const condition = project.configuration.get("conditions").get(test);

  const source = condition.get("source");
  const defaultValue = condition.get("default");

  if (source !== "env") {
    throw new Error("The only supported configuration source is 'env'");
  }

  return bool(process.env[test]) ?? defaultValue;
}

// env vars from the cli are always strings, so !!ENV_VAR returns true for "false"
function bool(value: string | undefined): boolean | undefined {
  return value && value !== "false" && value !== "0";
}
