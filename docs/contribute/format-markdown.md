---
description: Follow these guidelines for formatting Markdown content.
sidebar_position: 3
---

# Format Markdown

Guidelines for formatting Markdown help writers and reviewers navigate the documentation source code
and review changes.
Refer to the following guidelines when formatting Markdown in ConsenSys documentation.
You can also see how to use [Docusaurus Markdown features](use-docusaurus-features.md#markdown-features).

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
