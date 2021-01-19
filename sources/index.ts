import { miscUtils, Plugin, SettingsType } from "@yarnpkg/core";

import { ConditionResolver } from "./ConditionResolver";
import { ConditionFetcher } from "./ConditionFetcher";
import { beforeWorkspacePacking } from "./hooks";
import { configuration } from "./configuration";

export { plugin as default };
const plugin: Plugin = {
  configuration,
  fetchers: [ConditionFetcher],
  resolvers: [ConditionResolver],
  hooks: {
    beforeWorkspacePacking,
  },
};
