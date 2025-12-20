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
  - `remark-fix-components` - Fixes missing component imports based on YAML config

- **Port Script** (`scripts/pipeline/port-content.js`)
  - Downloads content via `docusaurus-plugin-remote-content`
  - Applies component and image transformations
  - Writes logs to `_maintainers/logs/`

- **Helper Functions** (`src/lib/`)
  - `get-ported-dirs.js` - Reads ported content directories from `docusaurus.config.js` (single source of truth)
  - `config-loader.js` - Loads settings from `_maintainers/link-replacements.yaml`

- **Configuration**
  - **`docusaurus.config.js`** - Defines ported content directories (via `docusaurus-plugin-remote-content` `outDir`)
  - **`_maintainers/link-replacements.yaml`** - Link rewriting rules, component replacements, and settings

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

**Important:** The `outDir` values in `docusaurus-plugin-remote-content` configurations are the **single source of truth** for where ported content is stored. Plugins automatically detect these directories via `src/lib/get-ported-dirs.js` - you don't need to configure them separately.

**Documentation:** See [docusaurus-plugin-remote-content on npm](https://www.npmjs.com/package/docusaurus-plugin-remote-content) for full configuration options.

### Link Replacement Types

The system handles four types of link replacements:

| Type | Plugin | Configuration | Description |
|------|--------|--------------|-------------|
| **Component Imports** | `remark-fix-components` | `_maintainers/link-replacements.yaml` | Replaces component imports based on `componentReplacements` config, or comments out if not configured |
| **Relative Links from Upstream** | `remark-link-rewriter` | `_maintainers/link-replacements.yaml` | Converts relative paths that don't exist locally to external URLs |
| **Image Links** | `remark-fix-image-paths` | `_maintainers/link-replacements.yaml` | Rewrites image paths to configured `imagePath` (default: `/img/ported-images/{filename}`). Images downloaded via `docusaurus-plugin-remote-content` |
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

### Configuration Files

#### `docusaurus.config.js`

**Ported Content Directories:** The `outDir` values in `docusaurus-plugin-remote-content` plugin configurations define where ported content is stored. These are automatically detected by the plugins - no additional configuration needed.

#### `_maintainers/link-replacements.yaml`

Configuration for link rewriting, component replacements, and settings:

```yaml
# Global settings
settings:
  # Image directory path (where images are served from)
  imagePath: "/img/ported-images"
  
  # Default messages for unconfigured components/plugins
  defaultComponentMessage: "Component not available in this project"
  defaultPluginMessage: "Plugin not available in this project"

# Link rewriting rules
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

# Component replacements
componentReplacements:
  - component: CreditCost
    importPath: '@site/src/components/CreditCost/CreditCostPrice\\.js'
    replacement: 'For credit cost information, see [credit cost details](/docs/...).'
    jsxReplacement: 'For credit cost information, see [credit cost details](/docs/...).'
    insertNote: true
```

### Pattern Syntax

- **Exact matches**: Use `replacements` section for simple path-to-URL mappings
- **Pattern matches**: Use `patterns` section with regex for flexible matching
- **Network placeholders**: Use `{network}` in replacement (extracted from pattern capture group)
- **Path extraction**: Set `extractPath: true` to append remaining path after pattern match

### Plugin Import Syntax

Plugins are imported in `docusaurus.config.js`. Ported content directories are automatically detected from `docusaurus-plugin-remote-content` configurations:

```javascript
beforeDefaultRemarkPlugins: [
  require("./plugins/remark-link-rewriter"),
  require("./plugins/remark-fix-image-paths"),
  require("./plugins/remark-fix-components"),
],
```

**Note:** Plugins automatically read:
- Ported content directories from `docusaurus-plugin-remote-content` `outDir` values
- Configuration from `_maintainers/link-replacements.yaml`
- No additional plugin configuration needed

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

## Component Replacements

Component imports can be replaced with custom content via `componentReplacements` in `_maintainers/link-replacements.yaml`:

```yaml
componentReplacements:
  - component: ComponentName
    importPath: '@site/src/components/ComponentName/ComponentPath\\.js'
    replacement: 'Replacement text or markdown link'
    jsxReplacement: 'Replacement for JSX usage (optional)'
    insertNote: true  # Insert replacement as note after imports
```

If a component isn't configured, it's commented out with the default message.

## Image Handling

Images are downloaded via `docusaurus-plugin-remote-content` to `static/img/ported-images/` and paths are rewritten by `remark-fix-image-paths` to the configured `imagePath` (default: `/img/ported-images/{filename}`).

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

