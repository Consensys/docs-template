---
title: Imports
---

# Imports in Docusaurus

Docusaurus uses MDX, which supports React imports. Import components, content, and assets into your documentation.

## Docusaurus Theme Components

Import built-in Docusaurus components:

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="option1" label="Option 1">
    Content here
  </TabItem>
</Tabs>
```

**Available aliases:**
- `@theme/*` - Docusaurus theme components (Tabs, TabItem, CodeBlock, etc.)
- `@site/*` - Site root (for custom components in `src/`)
- `@docusaurus/*` - Docusaurus core utilities

## MDX Content Imports

Import other MDX files as components:

```mdx
import Description from "./_partials/_description.mdx";
import Params from "../_partials/_parameters.mdx";

<Description />
<Params />
```

**Path types:**
- Relative: `./file.mdx` or `../folder/file.mdx`
- Absolute: `/docs/path/to/file.mdx` (from site root)

## React Component Imports

Import custom React components:

```mdx
import MyComponent from '@site/src/components/MyComponent';

<MyComponent prop="value" />
```

Components must be in `src/components/` or configured in `docusaurus.config.js` aliases.

## Example from Ported Content

From `web3_clientversion.mdx`:

```mdx
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import Description from "/services/reference/_partials/_web3_clientversion-description.mdx";

# Title

<Description />

<Tabs>
  <TabItem value="example" label="Example">
    Content
  </TabItem>
</Tabs>
```

## Notes

- Imports must be at the top of the file (before any content)
- MDX files can import other MDX files
- React components can use JSX syntax
- Missing imports cause build errors
