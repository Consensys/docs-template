---
title: Plugins Method
---

# Plugins Method for Porting Data

Port content from upstream repositories using remark plugins and `docusaurus-plugin-remote-content`.

## Quick Start

```bash
npm run port
```

Downloads content, applies transformations, writes logs, and starts dev server.

## Components

- **Plugins** (`plugins/`)
  - `remark-link-rewriter.js` - Rewrites links based on YAML config
  - `remark-fix-image-paths.js` - Fixes image paths
  - `remark-fix-components.js` - Fixes missing component imports based on YAML config

- **Helper Functions** (`src/lib/`)
  - `get-ported-dirs.js` - Reads ported content directories from `docusaurus.config.js`
  - `config-loader.js` - Loads settings from `_maintainers/link-replacements.yaml`

- **Port Script** (`scripts/pipeline/port-content.js`)
  - Downloads via `docusaurus-plugin-remote-content`
  - Applies transformations
  - Writes logs to `_maintainers/logs/`

- **Configuration**
  - **`docusaurus.config.js`** - Defines ported content directories (single source of truth)
  - **`_maintainers/link-replacements.yaml`** - Link rewriting, component replacements, settings

## See Also

- [Porting data between repositories](./port-data) - The documentation
- [CI method](../CI-method/README) - Alternative approach (not developed)

