---
title: Pondering single sourcing
---

Single sourcing can be brittle and raises questions around:

Accepting/declining upstream changes:
- How should PRs be done to bring data from upstream into the downstream repo?
	 - Should a maintainer (re)review all the work that was approved at an upstream?
	 - (If we dont have CLI tool to pull changes which would then separate upstream diffs from local diffs) Should the upstream:downstream diff be included on PRs whose purpose may not be related (as the tool can be run at any time by maintainer)?

Maintainability:
- Is there anyone who will maintain the solution's code?
- Is it too complicated a pipeline to pay dividends?

Complexity:

So many decisions need to be made about the flow. At the time of writing the [Plugin method](./Plugins/port-data.md), lets me remove a network such as Ethereum from the import config, yet, unless I also delete that folder locally, it will be retained, meaning some networks could be piped in and data kept fresh alongside others that may not be fresh.

In previous tests, I handled for naming folders if they have no title. This adds a level of complexity that may degrade the tool's usefulness. A simpler fix is to switch the H1 for a title in the upstream, which means that the downstream repo then dictates the upstream's configuration.

Conclusion:

Not yet convinced that the risks are worth the reward.

import DocCardList from '@theme/DocCardList';

<DocCardList />