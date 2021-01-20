import { Plugin } from "@yarnpkg/core";

import { ConditionResolver } from "./ConditionProtocol/Resolver";
import { ConditionFetcher } from "./ConditionProtocol/Fetcher";
import { beforeWorkspacePacking } from "./hooks";
import { configuration } from "./configuration";
import { MaterlializeCommand } from "./commands/materialize";

export { plugin as default };
const plugin: Plugin = {
  configuration,
  commands: [MaterlializeCommand],
  fetchers: [ConditionFetcher],
  resolvers: [ConditionResolver],
  hooks: {
    beforeWorkspacePacking,
  },
};
