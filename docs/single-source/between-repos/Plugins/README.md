---
title: Plugins Method
---

# Plugins method for porting data

This is a partially-tested method for porting content from upstream repositories. It uses modular remark plugins and `docusaurus-plugin-remote-content` to download and transform content.

## Overview

The Plugins method:
- Uses `docusaurus-plugin-remote-content` to download content from upstream
- Applies modular remark plugins for transformations
- Runs link rewriting, image fixes, and logging before build
- Starts local dev server

## Quick start

```bash
npm run port
```

This command:
1. Downloads content and images from MetaMask docs using `docusaurus-plugin-remote-content` (configured in `docusaurus.config.js`)
2. Runs all transformation plugins (link rewriting, image path fixes)
3. Writes logs to `_maintainers/logs/`
4. Starts the local dev server

## Architecture

### Modular plugins

Plugins are located in `src/remark/` for better organization and testing:
- `remark-link-rewriter.js` - Rewrites links based on YAML config
- `remark-fix-image-paths.js` - Fixes image paths for Docusaurus
- Additional plugins can be added modularly

### Remote content plugin

Uses `docusaurus-plugin-remote-content` configured in `docusaurus.config.js` to download content and images. All downloads are configured in `docusaurus.config.js` and visible in the console log when running `npm run port`.

### Configuration

- Link replacements: `_maintainers/link-replacements.yaml` (generic patterns)
- Plugins: `src/remark/` (modular remark plugins)
- Logs: `_maintainers/logs/` (all transformations logged)

## See also

- See `docusaurus.config.js` for all configured downloads.
- [Porting Data Between Repositories](./port-data.md) - Plugin documentation
- [CI Method](/single-source/between-repos/CI-method) - Alternative approach (needs testing)

