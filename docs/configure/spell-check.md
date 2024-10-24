---
description: Configure spell check using CSpell.
sidebar_label: Spell check
sidebar_position: 5
---

# Configure spell check

:::info important
Documentation repositories are in the process of being migrated to use Vale instead of [CSpell](https://cspell.org/).

Refer to the [instructions on how to use Vale](../contribute/run-vale.md).
:::

This template repository uses [CSpell](https://cspell.org/) to check for misspelled words
throughout the documentation.
CSpell runs when you run [`npm run lint:spelling`](../create/run-in-development.md).

You don't often need to edit the [`.cspell.json`](../create/repo-structure.md#-cspelljson) file itself.
However, you can add ignore paths or files if needed.

:::note
We don't recommend ignoring entire files by placing them into `.cspell.json`.

Instead, we recommend using [in-line comments](https://cspell.org/configuration/document-settings/)
to disable spell check–for example, if you have a snippet of code with an example API key
which CSpell picks up.

If you use a new term that causes spell check to fail, you can [add the term to your project's dictionary](../create/run-in-development.md#npm-run-lintspelling).

If you have a large API page that causes spell check errors, it may make sense to exclude
the entire file or folder.
:::
