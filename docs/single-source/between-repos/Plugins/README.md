---
title: Plugins Method
---

# Plugins Method for Porting Data

This is the recommended method for porting content from upstream repositories. It uses modular remark plugins and `docusaurus-plugin-remote-content` to download and transform content.

## Overview

The Plugins method:
- Uses `docusaurus-plugin-remote-content` to download content from upstream
- Applies modular remark plugins for transformations
- Runs link rewriting, image fixes, and logging before build
- Starts local dev server

## Quick Start

```bash
npm run port
```

This command:
1. Downloads content from MetaMask docs using `docusaurus-plugin-remote-content`
2. Runs all transformation plugins (link rewriting, image fixes)
3. Writes logs to `_maintainers/logs/`
4. Starts the local dev server

## Architecture

### Modular Plugins

Plugins are located in `src/remark/` for better organization and testing:
- `remark-link-rewriter.js` - Rewrites links based on YAML config
- `remark-fix-image-paths.js` - Fixes image paths for Docusaurus
- Additional plugins can be added modularly

### Remote Content Plugin

Uses `docusaurus-plugin-remote-content` configured in `docusaurus.config.js` to download content from:
- MetaMask services index → `MetaMask-ported-data/index.md`
- Base JSON-RPC methods → `MetaMask-ported-data/reference/base/json-rpc-methods/`

### Configuration

- Link replacements: `_maintainers/link-replacements.yaml` (generic patterns, no hardcoded network names)
- Plugins: `src/remark/` (modular remark plugins)
- Logs: `_maintainers/logs/` (all transformations logged)

## Scripts Location

**Note:** The port script (`scripts/port-content.js`) must be in the project root (`scripts/` directory) to work with npm commands.

## Manual Download

To manually download content without starting the server:

```bash
npx docusaurus download-remote-metamask-services-index
npx docusaurus download-remote-metamask-base-json-rpc
```

## See Also

- [Porting Data Between Repositories](../port-data) - Full documentation
- [CI Method](../CI-method/README) - Alternative approach (archived)
- [MetaMask Ported Data](./MetaMask-ported-data/README) - Ported content

