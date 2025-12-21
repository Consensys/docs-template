---
title: CI Method
---

# CI Method for Porting Data

> **Note:** This is an alternative, untested approach. The partially-tested method is the [Plugins approach](/single-source/between-repos/Plugins/README).

## Overview

This method uses CI workflows to automatically sync content from upstream repositories by creating PRs with transformed content. It's a hybrid approach combining runtime plugins with CI-based sync PRs.

## Components

- **Sync Script**: `scripts/sync-metamask-content.js` - Downloads and transforms content
- **CI Workflow**: `.github/workflows/sync-metamask-content.yml` - Runs daily, creates PRs
- **Plugins**: Runtime remark plugins for link rewriting and image path fixing

## How it works

1. CI workflow runs daily at noon UTC
2. Detects changes in upstream MetaMask repo
3. Downloads specified content
4. Applies transformations using plugins
5. Creates/updates PR with transformed content

## Status

This approach is archived/paused. See the [Plugins method](/single-source/between-repos/Plugins/README) for the active implementation.

## Example output

The `example-ported-data/` folder in this directory shows example content that would be produced by the CI method. This is static example data for demonstration purposes.

## Files

- Sync script location: `scripts/sync-metamask-content.js` (note: script must be in project root)
- CI workflow: `.github/workflows/sync-metamask-content.yml`
- Configuration: `_maintainers/link-replacements.yaml`
- Example data: `CI-method/example-ported-data/`

