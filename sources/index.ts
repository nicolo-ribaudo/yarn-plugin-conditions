import { Plugin } from "@yarnpkg/core";

import { ConditionResolver } from "./ConditionProtocol/Resolver";
import { ConditionFetcher } from "./ConditionProtocol/Fetcher";
import { ConditionProxyResolver } from "./ConditionProxyProtocol/Resolver";
import { ConditionProxyFetcher } from "./ConditionProxyProtocol/Fetcher";
import { beforeWorkspacePacking } from "./hooks";
import { configuration } from "./configuration";

export { plugin as default };
const plugin: Plugin = {
  configuration,
  fetchers: [ConditionFetcher, ConditionProxyFetcher],
  resolvers: [ConditionResolver, ConditionProxyResolver],
  hooks: {
    beforeWorkspacePacking,
  },
};
