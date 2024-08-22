---
description: Follow these guidelines for formatting Markdown content.
sidebar_position: 3
---

# Format Markdown

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Guidelines for formatting Markdown help writers and reviewers navigate the documentation source code
and review changes.
They also ensure that Markdown features render properly on the doc site.

Refer to the following guidelines when formatting Markdown in Consensys docs.

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

<Tabs>

  <TabItem value="Markdown" label="Markdown" default>

```markdown
In this example, this first sentence exceeds 100 characters, so we recommend wrapping it into
multiple lines.
One line break displays as a space, so this Markdown renders as one paragraph without line breaks.
We also recommend starting each new sentence on a new line, even if the previous line didn't reach
100 columns, for easy reviewing.
You can set a [vertical ruler](https://dev.to/brad_beggs/vs-code-vertical-rulers-for-prettier-code-3gp3)
in your text editor as a heuristic.
```

  </TabItem>
  <TabItem value="Rendered" label="Rendered">

In this example, this first sentence exceeds 100 characters, so we recommend wrapping it into
multiple lines.
One line break displays as a space, so this Markdown renders as one paragraph without line breaks.
We also recommend starting each new sentence on a new line, even if the previous line didn't reach
100 columns, for easy reviewing.
You can set a [vertical ruler](https://dev.to/brad_beggs/vs-code-vertical-rulers-for-prettier-code-3gp3)
in your text editor as a heuristic.

  </TabItem>
</Tabs>

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

<Tabs>

  <TabItem value="Markdown" label="Markdown" default>

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

  </TabItem>
  <TabItem value="Rendered" label="Rendered">

:::caution important
`eth_sign` is deprecated.
:::

:::note
MetaMask supports signing transactions using Trezor and Ledger hardware wallets.
These wallets only support signing data using `personal_sign`.
If you can't log in to a dapp when using a Ledger or Trezor, the dapp might be requesting you to
sign data using an unsupported method, in which case we recommend using your standard MetaMask account.
:::

  </TabItem>
</Tabs>

## Code samples

Use [code blocks](https://docusaurus.io/docs/markdown-features/code-blocks) to present code samples.

A basic code block uses triple back ticks (`` ` ``) and the language name to enable
[syntax highlighting](https://docusaurus.io/docs/markdown-features/code-blocks#syntax-highlighting).
For example:

<Tabs>

  <TabItem value="Markdown" label="Markdown" default>

````markdown
```javascript
if (typeof window.ethereum !== "undefined") {
  console.log("MetaMask is installed!");
}
```
````

  </TabItem>
  <TabItem value="Rendered" label="Rendered">

```javascript
if (typeof window.ethereum !== "undefined") {
  console.log("MetaMask is installed!");
}
```

  </TabItem>
</Tabs>

### Code sample style guide

Make sure to provide developer-friendly code samples.
The following are some rules used throughout the Consensys docs:

- Use double quotes (`"`) instead of single quotes (`'`).
- Indent lines using two spaces instead of four.
- Write code samples that can be easily copied and pasted, and work as expected.
- Follow the style guide of the programming language used in the code sample.

:::info example

❌ *To start Teku, run the following command:*

```bash
// Set --ee-endpoint to the URL of your execution engine and
// --ee-jwt-secret-file to the path to your JWT secret file.
user@mycomputer Develop % teku --ee-endpoint=http://localhost:8550 --ee-jwt-secret-file=my-jwt-secret.hex
```

✅ *To start Teku, run the following command:*

```bash
teku \
  --ee-endpoint=<URL of execution engine>        \
  --ee-jwt-secret-file=<path to JWT secret file> \
  --metrics-enabled=true                         \
  --rest-api-enabled=true
```

:::

See the
[Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples)
for more guidelines for writing code examples.

## Tabs

Use [tabs](https://docusaurus.io/docs/markdown-features/tabs) to display certain content, such as
code samples in different languages.
For example:

````jsx
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

<Tabs>
<TabItem value="HTML">

```html
<!-- HTML code block -->
```

</TabItem>
<TabItem value="JavaScript">

```javascript
// JavaScript code block
```

</TabItem>
<TabItem value="Markdown">

```markdown
- This is an example Markdown list.
- This is **bold** and *italicized* text.
```

</TabItem>
</Tabs>
````

This renders as the following:

<Tabs>
<TabItem value="HTML">

```html
<!-- HTML code block -->
```

</TabItem>
<TabItem value="JavaScript">

```javascript
// JavaScript code block
```

</TabItem>
<TabItem value="Markdown">

```markdown
- This is an example Markdown list.
- This is **bold** and *italicized* text.
```

</TabItem>
</Tabs>
