---
description: How to use common Markdown features.
sidebar_position: 2
---

# Markdown features

The documentation is built using [Docusaurus](https://docusaurus.io/), which is powered by
[MDX](https://mdxjs.com/), an extension to [Markdown](https://www.markdownguide.org/) that allows
you to use JavaScript in your documentation content.
See the [Docusaurus documentation](https://docusaurus.io/docs/markdown-features) on how to use its
Markdown and MDX features.

> **Tip:** [Admonitions](https://docusaurus.io/docs/markdown-features/admonitions),
[tabs](https://docusaurus.io/docs/markdown-features/tabs), and
[code blocks](https://docusaurus.io/docs/markdown-features/code-blocks) are frequently used in the
ConsenSys documentation.

The following sections describe features that aren't documented in the Docusaurus documentation.

### Simplified tabs

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
