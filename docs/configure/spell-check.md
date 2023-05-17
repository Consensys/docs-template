---
description: Configure spell check with CSpell.
sidebar_label: Spell check
sidebar_position: 5
---

# Configure spell check

We recommend using [`cspell`](../create/repo-structure.md#-cspelljson) to do
spell checks for you which is automatically run when you
[`git commit`](../create/run-in-development.md) or if you manually run
[`npm run lint:spelling`](../create/run-in-development.md).

You usually don't need to edit the `.cspell.json` file itself.
However, if there is a need, it is most likely to add ignore paths or files.

:::tip
To avoid CSpell missing any spelling mistakes, we don't recommend disabling
entire files by placing them into the `.cspell.json` if you can avoid it.

Instead, we recommend using in-line comments to disable checks.
This is common where you have a snippet of code which has an example API key
which CSpell will pick up.

However, if you have a large API page then it may make more sense to exclude the
entire file or folder instead of placing in-line comments.
:::

The in-line document settings can be found
[here](https://cspell.org/configuration/document-settings/).
