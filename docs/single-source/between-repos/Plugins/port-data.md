---
title: How it works
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Porting data between repositories

Port content from upstream repositories using remark plugins and `docusaurus-plugin-remote-content`.

## Overview

The porting system uses **runtime plugins** to transform content at build time:

1. **Download** - `docusaurus-plugin-remote-content` fetches content from upstream
2. **Transform** - Remark plugins rewrite links, fix image paths, and handle components
3. **Build** - Docusaurus builds with transformed content

## Architecture

### Components

- **Remark Plugins** (`plugins/`)
  - `remark-link-rewriter` - Rewrites links based on YAML config (used at build time)
  - `remark-fix-image-paths` - Fixes image paths for Docusaurus (used at build time)

- **Port Script** (`scripts/port-content.js`)
  - Downloads content via `docusaurus-plugin-remote-content`
  - Applies transformations: MDX syntax fixes, component import removal, broken link removal, image path fixes
  - Writes logs to `_maintainers/logs/`

- **Configuration** (`_maintainers/link-replacements.yaml`)
  - Link rewriting rules (exact and pattern-based)
  - Generalized network support via patterns

## Configuration

### Remote content plugin

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

### Link replacement types

The system handles four types of link replacements:

| Type | Tool | Configuration | Description |
|------|------|--------------|-------------|
| **Component Imports** | `scripts/port-content.js` | None | Removes missing `@site/src/components` and `@site/src/plugins` imports, comments out component usage |
| **MDX Syntax** | `scripts/port-content.js` | None | Fixes MDX syntax issues (adds blank lines after imports) |
| **Broken Links** | `scripts/port-content.js` | None | Removes broken internal markdown links that can't be resolved |
| **Image Links** | `scripts/port-content.js` | None | Rewrites image paths to `@site/static/img/{filename}`. Images downloaded via `docusaurus-plugin-remote-content` |
| **Relative Links from Upstream** | `remark-link-rewriter` | `_maintainers/link-replacements.yaml` | Converts relative paths that don't exist locally to external URLs (applied at build time) |
| **Absolute Paths** | `remark-link-rewriter` | `_maintainers/link-replacements.yaml` | Rewrites absolute paths (starting with `/`) to local paths or external URLs based on YAML patterns (applied at build time) |

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

### Link replacements configuration

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

### Pattern syntax

- **Exact matches**: Use `replacements` section for simple path-to-URL mappings
- **Pattern matches**: Use `patterns` section with regex for flexible matching
- **Network placeholders**: Use `{network}` in replacement (extracted from pattern capture group)
- **Path extraction**: Set `extractPath: true` to append remaining path after pattern match

### Plugin import syntax

Remark plugins are imported in `docusaurus.config.js` and applied at build time:

<Tabs>
  <TabItem value="simple" label="Simple Import" default>

```javascript
remarkPlugins: [
  require("./plugins/remark-link-rewriter"),
  require("./plugins/remark-fix-image-paths"),
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

**Note:** Component fixes, broken link removal, and MDX syntax fixes are handled by `scripts/port-content.js` during the port process, not by remark plugins.

### Adding new networks

To add a new network, update the YAML patterns:

```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
    description: 'Rewrite links for new-network'
```

No code changes needed - the system is fully generalized.

## Image handling

:::warning

All images from the upstream repo are currently copied.

::: 

Images are downloaded via `docusaurus-plugin-remote-content` to `static/img/ported-images/` and paths are rewritten by `remark-fix-image-paths` to `/img/ported-images/{filename}`.

## Logging

All transformations are logged to `_maintainers/logs/`:
- `transformation-summary.log` - Summary per run (downloads, transformations applied)
- `links-dropped.log` - Removed broken links
- `component-import-fixes.log` - Removed component/plugin imports
- `image-operations.log` - Image path fixes
- `build-errors.log` - Build and download errors

**Note:** Link rewrites from `remark-link-rewriter` are applied at build time and logged by the plugin itself.

## Usage

### Port content

```bash
npm run port
```

This command:
1. Downloads content via `docusaurus-plugin-remote-content`
2. Applies transformations:
   - Fixes MDX syntax (adds blank lines after imports)
   - Removes missing component imports (`@site/src/components`, `@site/src/plugins`)
   - Removes broken internal markdown links
   - Fixes image paths
3. Writes logs to `_maintainers/logs/`
4. Starts dev server (unless `--no-server` flag is used)

### Command-line options

```bash
# Port content without starting dev server
npm run port -- --no-server

# Port content and build (no dev server)
npm run port -- --build
```

### Environment variables

The script loads environment variables from `.env` file in the project root using `dotenv`.

**Required for GitHub API:**
- `API_TOKEN` or `GITHUB_TOKEN` - GitHub personal access token for higher rate limits (5000/hour vs 60/hour)
  - Get a token at: https://github.com/settings/tokens
  - No special permissions needed
  - Add to `.env`: `API_TOKEN=your_token_here`

## Error handling

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

## Troubleshooting

- **Links not rewriting**: Check `_maintainers/link-replacements.yaml` and verify patterns match your paths
- **Images not working**: Check `_maintainers/logs/image-operations.log` for image path fixes
- **Build failing**: Check `_maintainers/logs/build-errors.log` and verify YAML syntax
- **GitHub rate limits**: Set `API_TOKEN` (or `GITHUB_TOKEN`) in `.env` file for higher rate limits (5000/hour)
- **Component errors**: Check `_maintainers/logs/component-import-fixes.log` to see which imports were removed
- **MDX compilation errors**: The script fixes common MDX syntax issues (blank lines after imports)

## Examples

### Adding a new network

Update `_maintainers/link-replacements.yaml`:
```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
```

### Preserving external links

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

