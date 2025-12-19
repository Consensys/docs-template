---
title: Pondering single sourcing
---

Single sourcing can be brittle and raises questions around:

Accepting/declining upstream changes:
- How should PRs be done to bring data from upstream into the downstream repo?
	 - Should a maintainer review all the work that was approved at an upstream?
	 - Should the diff be included on PRs whose purpose may not be related?
- CLI tool would separate upstream diffs from local diffs

Maintainability:
- Is there anyone who will maintain the solution?
- Is it too complicated a pipeline to pay dividends?
