---
description: Follow these guidelines for formatting Markdown content.
sidebar_position: 3
---

# Format Markdown

Guidelines for formatting Markdown help writers and reviewers navigate the documentation source code
and review changes.
They also ensure that Markdown features render properly on the doc site.

Refer to the following guidelines when formatting Markdown in ConsenSys docs.

:::tip note
The Markdown syntax for [admonitions](#admonitions) and [tabs](#tabs) is specific to Docusaurus.
See the [Docusaurus Markdown documentation](https://docusaurus.io/docs/markdown-features/) for more
information on using Markdown features specific to Docusaurus.
:::

## File names

The name of each documentation folder and Markdown file must contain only lowercase letters and
dashes (`-`) to represent spaces.
Use simple file names that match the page titles and that make sense with the entire file path.
For example:

```text
how-to/
├─ get-started.md
├─ manage-keys.md
├─ request-permissions.md
├─ troubleshoot.md
concepts/
├─ architecture.md
├─ lifecycle.md
├─ execution-environment.md
...
```

## Metadata

You can configure metadata for each doc page using [Markdown front
matter](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs#markdown-front-matter)
at the top of the page.
For example:

```markdown
---
title: Use MetaMask SDK with React
sidebar_label: React
sidebar_position: 2
description: Import MetaMask SDK into your React dapp.
max_toc_heading_level: 3
---
```

You should provide at least a clear description for each page using front matter.

## Column limit

Each Markdown line should be (roughly) [limited to 100 columns
long](https://google.github.io/styleguide/javaguide.html#s4.4-column-limit) to be readable on any editor.
For example:

<!--tabs-->

# Markdown

```markdown
In this example, this first sentence exceeds 100 characters, so we recommend wrapping it into
multiple lines.
One line break displays as a space, so this Markdown renders as one paragraph without line breaks.
We also recommend starting each new sentence on a new line, even if the previous line didn't reach
100 columns, for easy reviewing.
You can set a [vertical ruler](https://dev.to/brad_beggs/vs-code-vertical-rulers-for-prettier-code-3gp3)
in your text editor as a heuristic.
```

# Rendered

In this example, this first sentence exceeds 100 characters, so we recommend wrapping it into
multiple lines.
One line break displays as a space, so this Markdown renders as one paragraph without line breaks.
We also recommend starting each new sentence on a new line, even if the previous line didn't reach
100 columns, for easy reviewing.
You can set a [vertical ruler](https://dev.to/brad_beggs/vs-code-vertical-rulers-for-prettier-code-3gp3)
in your text editor as a heuristic.

<!--/tabs-->

## Tables

Format tables to be readable in the source code.
Add an appropriate number of spaces to align the columns in the source code.
For example, do this:

```markdown
| Syntax    | Description |
|-----------|-------------|
| Name      | Title       |
| Paragraph | Text        |
```

Not this:

```markdown
| Syntax | Description |
|--|--|
| Name | Title |
| Paragraph | Text |
```

You can quickly format tables using [Markdown Table Formatter](http://markdowntable.com/) or
create tables from scratch using [Tables Generator](https://www.tablesgenerator.com/markdown_tables).
Some editors also have settings or plugins to auto-format Markdown tables.

## Admonitions

Use [admonitions](https://docusaurus.io/docs/markdown-features/admonitions) to include side content
or highlight important content.
For example:

<!--tabs-->

# Markdown

```markdown
:::caution important
`eth_sign` is deprecated.
:::

:::note
MetaMask supports signing transactions using Trezor and Ledger hardware wallets.
These wallets only support signing data using `personal_sign`.
If you can't log in to a dapp when using a Ledger or Trezor, the dapp might be requesting you to
sign data using an unsupported method, in which case we recommend using your standard MetaMask account.
:::
```

# Rendered

:::caution important
`eth_sign` is deprecated.
:::

:::note
MetaMask supports signing transactions using Trezor and Ledger hardware wallets.
These wallets only support signing data using `personal_sign`.
If you can't log in to a dapp when using a Ledger or Trezor, the dapp might be requesting you to
sign data using an unsupported method, in which case we recommend using your standard MetaMask account.
:::

<!--/tabs-->

## Code blocks

Use [code blocks](https://docusaurus.io/docs/markdown-features/code-blocks) to present code samples.

:::tip
Remember to provide [developer-friendly code samples](style-guide.md#3-write-for-developers).
:::

A basic code block uses triple back ticks (`` ` ``) and the language name to enable
[syntax highlighting](https://docusaurus.io/docs/markdown-features/code-blocks#syntax-highlighting).
For example:

<!--tabs-->

# Markdown

````markdown
```javascript
if (typeof window.ethereum !== 'undefined') {
  console.log('MetaMask is installed!');
}
```
````

# Rendered

```javascript
if (typeof window.ethereum !== 'undefined') {
  console.log('MetaMask is installed!');
}
```

<!--/tabs-->

## Tabs

The [`remark-docusaurus-tabs`](https://github.com/mccleanp/remark-docusaurus-tabs) plugin allows you
to add content in [tabs](https://docusaurus.io/docs/markdown-features/tabs) using simplified syntax.

For example, add code blocks to tabs as follows:

````jsx
<!--tabs-->

# HTML

```html
<!-- HTML code block -->
```

# JavaScript

```javascript
// JavaScript code block
```

# Markdown

- This is an example Markdown list.
- This is **bold** and *italicized* text.

<!--/tabs-->
````

It renders as the following:

<!--tabs-->

# HTML

```html
<!-- HTML code block -->
```

# JavaScript

```javascript
// JavaScript code block
```

# Markdown

- This is an example Markdown list.
- This is **bold** and *italicized* text.

<!--/tabs-->
