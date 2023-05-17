---
description: Best practices for formatting Markdown content.
sidebar_position: 1
---

# Best practices

Having a standard for formatting Markdown helps writers and reviewers navigate the code and review changes.
The following are rules for formatting Markdown in ConsenSys documentation:

- The name of each documentation folder and Markdown file must contain only lowercase letters and
  dashes (`-`).
  For example, `get-started`, `truffle.md`, and `performance-best-practices.md`.

- Each Markdown file must contain a header composed of
  [metadata](https://squidfunk.github.io/mkdocs-material/setup/extensions/python-markdown/#metadata) and limited by
  three dashes (`-`).

  :::tip example

        ```markdown
        ---
        title: Installation overview
        description: Overview and requirements to install the software
        ---
        ```
  :::

- For the rest of the Markdown code, each line should be (roughly)
  [limited to 100 columns long](https://google.github.io/styleguide/javaguide.html#s4.4-column-limit) to be readable on
  any editor.
  You'll receive a warning, not an error, if you exceed 100 columns.
  Lines must be wrapped without cutting the line in the middle of a word.
  One line break displays as a space.

  :::tip example

        ```markdown
        In this example, this first sentence exceeds 100 characters, so we recommend wrapping it into
        multiple lines.
        One line break displays as a space, so this Markdown renders as one paragraph without line breaks.
        We also recommend starting each new sentence on a new line, even if the previous line didn't reach
        100 columns, for easy reviewing.
        You can set a column marker in your text editor as a heuristic.
        ```
  :::

- Use only one first level title (prefixed with a single `#`) on a page.

- No HTML markup can be used inside a Markdown document.
  You can use many extensions that have similar capabilities without HTML.

  There's one exception where HTML is tolerated: tables that are too complex and already exist.
  If possible, keep the table simple without any elements other than `table`, `tr`, and `td`.

- If using Markdown tables, format them so they're also readable in the source code.
  For example, add an appropriate number of spaces to align the columns in the source code.

  :::tip example

        ```markdown
        | Syntax    | Description |
        | --------- | ----------- |
        | Name      | Title       |
        | Paragraph | Text        |
        ```
  :::

  You can quickly formate tables by using [Markdown Table Formatter](http://markdowntable.com/) or create tables from
  scratch using [Tables Generator](https://www.tablesgenerator.com/markdown_tables).

- Code samples should be written so that users can copy and paste them with minimal
  editing and have them work as expected.