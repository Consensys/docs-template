---
title: How it works
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Porting Data Between Repositories

Port content from upstream repositories using remark plugins and `docusaurus-plugin-remote-content`.

## Overview

The porting system uses **runtime plugins** to transform content at build time:

1. **Download** - `docusaurus-plugin-remote-content` fetches content from upstream
2. **Transform** - Remark plugins rewrite links, fix image paths, and handle components
3. **Build** - Docusaurus builds with transformed content

## Architecture

### Components

- **Remark Plugins** (`plugins/`)
  - `remark-link-rewriter` - Rewrites links based on YAML config
  - `remark-fix-image-paths` - Fixes image paths for Docusaurus
  - `remark-fix-components` - Fixes missing component imports

- **Port Script** (`scripts/pipeline/port-content.js`)
  - Downloads content via `docusaurus-plugin-remote-content`
  - Applies component and image transformations
  - Writes logs to `_maintainers/logs/`

- **Configuration** (`_maintainers/link-replacements.yaml`)
  - Link rewriting rules (exact and pattern-based)
  - Generalized network support via patterns

## Configuration

### Remote Content Plugin

Content is downloaded using `docusaurus-plugin-remote-content`. Configure it in `docusaurus.config.js`:

```javascript
plugins: [
  [
    "docusaurus-plugin-remote-content",
    {
      name: "metamask-services-index",
      sourceBaseUrl: "https://github.com/MetaMask/metamask-docs",
      outDir: "docs/single-source/between-repos/Plugins/MetaMask-ported-data",
      documents: ["services/index.md"],
      performCleanup: false,
    },
  ],
  // ... more remote content sources
],
```

**Documentation:** See [docusaurus-plugin-remote-content on npm](https://www.npmjs.com/package/docusaurus-plugin-remote-content) for full configuration options.

### Link Replacement Types

The system handles four types of link replacements:

| Type | Plugin | Configuration | Description |
|------|--------|--------------|-------------|
| **Component Imports** | `remark-fix-components` | None | Comments out missing `@site/src/components` imports and replaces `CreditCost` component usage with links |
| **Relative Links from Upstream** | `remark-link-rewriter` | `_maintainers/link-replacements.yaml` | Converts relative paths that don't exist locally to external URLs |
| **Image Links** | `remark-fix-image-paths` | None | Rewrites image paths to `/img/ported-images/{filename}`. Images downloaded via `docusaurus-plugin-remote-content` |
| **Absolute Paths** | `remark-link-rewriter` | `_maintainers/link-replacements.yaml` | Rewrites absolute paths (starting with `/`) to local paths or external URLs based on YAML patterns |

<details>
  <summary>Examples</summary>

**Relative Links:**
- `../../concepts/websockets.md` → `https://docs.metamask.io/services/concepts/websockets.md`
- `concepts/archive-data.md` → `https://docs.metamask.io/services/concepts/archive-data.md`

**Absolute Paths (ported networks → local):**
- `/services/reference/base/json-rpc-methods/eth_call` → `/reference/base/json-rpc-methods/eth_call`
- `/services/reference/ethereum/...` → `/reference/ethereum/...`

**Absolute Paths (non-ported networks → external):**
- `/services/reference/sei/json-rpc-methods/eth_call` → `https://docs.metamask.io/services/reference/sei/json-rpc-methods/eth_call`
- `/services/reference/arbitrum/...` → `https://docs.metamask.io/services/reference/arbitrum/...`

</details>

### Link Replacements Configuration

Configuration is stored in `_maintainers/link-replacements.yaml`:

```yaml
replacements:
  /services: https://docs.metamask.io/services

patterns:
  # Generic JSON-RPC methods pattern - works for any ported network
  - pattern: '/services/reference/(base|ethereum|linea)/json-rpc-methods/.+'
    replacement: '/reference/{network}/json-rpc-methods'
    extractPath: true
    description: 'Rewrite JSON-RPC method links for ported networks'
  
  # Preserve full MetaMask paths for non-ported networks
  - pattern: '/services/reference/(sei|arbitrum)/.+'
    replacement: 'https://docs.metamask.io/services/reference/{network}'
    extractPath: true
    description: 'Preserve full MetaMask path for non-ported networks'
```

### Pattern Syntax

- **Exact matches**: Use `replacements` section for simple path-to-URL mappings
- **Pattern matches**: Use `patterns` section with regex for flexible matching
- **Network placeholders**: Use `{network}` in replacement (extracted from pattern capture group)
- **Path extraction**: Set `extractPath: true` to append remaining path after pattern match

### Plugin Import Syntax

Plugins are imported in `docusaurus.config.js`:

<Tabs>
  <TabItem value="simple" label="Simple Import" default>

```javascript
remarkPlugins: [
  require("./plugins/remark-link-rewriter"),
  require("./plugins/remark-fix-image-paths"),
  require("./plugins/remark-fix-components"),
],
```

  </TabItem>
  <TabItem value="configured" label="With Configuration Options">

```javascript
remarkPlugins: [
  [require("./plugins/remark-link-rewriter"), {
    configPath: "_maintainers/link-replacements.yaml",
    portedContentDir: "docs/single-source/between-repos/Plugins/MetaMask-ported-data",
  }],
],
```

  </TabItem>
</Tabs>

### Adding New Networks

To add a new network, update the YAML patterns:

```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
    description: 'Rewrite links for new-network'
```

No code changes needed - the system is fully generalized.

## Image Handling

Images are downloaded via `docusaurus-plugin-remote-content` to `static/img/ported-images/` and paths are rewritten by `remark-fix-image-paths` to `/img/ported-images/{filename}`.

## Logging

All transformations are logged to `_maintainers/logs/`:
- `links-replaced.log` - Link rewrites
- `links-dropped.log` - Removed links
- `component-import-fixes.log` - Component fixes
- `image-operations.log` - Image operations
- `build-errors.log` - Build errors
- `transformation-summary.log` - Summary per run

## Usage

### Port Content

```bash
npm run port
```

This command:
1. Downloads content via `docusaurus-plugin-remote-content`
2. Applies transformations (component fixes, image fixes)
3. Writes logs to `_maintainers/logs/`
4. Starts dev server

### Build for Testing

```bash
npm run port --build
```

Runs the port process and builds the site without starting the server.

## Error Handling

Errors are logged to `_maintainers/logs/build-errors.log`. Common issues:
- Missing config: Plugin uses defaults
- Invalid YAML: Error logged, defaults used
- Invalid regex: Pattern skipped
- Image/download failures: Logged, build continues

## Testing

Run tests:
```bash
npm test
```

Test files:
- `plugins/__tests__/remark-link-rewriter.test.js`
- `plugins/__tests__/remark-fix-image-paths.test.js`
- `scripts/pipeline/__tests__/port-content.test.js`

## Troubleshooting

- **Links not rewriting**: Check `_maintainers/link-replacements.yaml` and `_maintainers/logs/links-replaced.log`
- **Images not working**: Check `_maintainers/logs/image-errors.log`
- **Build failing**: Check `_maintainers/logs/build-errors.log` and verify YAML syntax
- **GitHub rate limits**: Set `GITHUB_TOKEN` in `.env` file

## Examples

### Adding a New Network

Update `_maintainers/link-replacements.yaml`:
```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
```

### Preserving External Links

For non-ported networks, links should point to external MetaMask docs, not local paths:
```yaml
patterns:
  # This pattern must come BEFORE the generic /services/reference/ pattern
  # to ensure non-ported networks use external URLs
  - pattern: '/services/reference/(sei|arbitrum|avalanche)/.+'
    replacement: 'https://docs.metamask.io/services/reference/{network}'
    extractPath: true
    description: 'Preserve external URLs for non-ported networks'
  
  # Generic pattern for all other networks (ported or manually maintained)
  - pattern: '/services/reference/([a-z0-9-]+)/.+'
    replacement: '/reference/{network}'
    extractPath: true
    description: 'Rewrite to local paths for ported/manually maintained networks'
```

**Important:** Patterns are matched in order. Place specific non-ported network patterns before the generic pattern so they match first.

