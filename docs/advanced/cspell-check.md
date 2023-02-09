---
sidebar_position: 9
---

# CSpell checking

It is recommended to use [`cspell`][cspelljson] to do spell checks for you which is automatically run when you [`git commit`](../getting-started/running-workflow.mdx#👨‍💻-committing-to-your-repo) or if you manually run [`npm run lint:spelling`](../getting-started/running-workflow.mdx#🧼-npm-run-lintspelling).

It is usually unnecessary to edit the [`.cspell.json`][cspelljson] file itself. However, if there is a need, it is most likely to add ignore paths or files.

:::tip

To avoid CSpell missing any spelling mistakes, it is **not** recommended to disable entire files by placing them into the [`.cspell.json`][cspelljson] if it can be avoided.

Instead, it is recommended to use in-line comments to disable checks. This is common where you have a snippet of code which has an example API key which will be picked up by CSpell.

However, if you have a large API page then it may make more sense to exclude the entire file or folder instead of placing in-line comments.

:::

The in-line document settings can be found [here](https://cspell.org/configuration/document-settings/).

[cspelljson]: ../getting-started/understanding-repo-layout.mdx#-cspelljson
