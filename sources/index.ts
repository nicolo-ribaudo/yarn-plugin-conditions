import { Plugin } from "@yarnpkg/core";

import { ConditionResolver } from "./ConditionProtocol/Resolver";
import { ConditionFetcher } from "./ConditionProtocol/Fetcher";
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
