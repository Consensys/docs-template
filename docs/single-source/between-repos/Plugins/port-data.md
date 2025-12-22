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
  - Both plugins are **generic** - they use `ported-files.log` to determine which files to process (no hardcoded paths)

- **Port Script** (`scripts/port-content.js`)
  - Downloads content and images via `docusaurus-plugin-remote-content` (configured in `docusaurus.config.js`)
  - Creates `_maintainers/logs/ported-files.log` listing all ported files (relative to `docs/`, without extensions)
  - Applies transformations: MDX syntax fixes, component import removal, broken link removal
  - Writes logs to `_maintainers/logs/`
  - Note: Image path rewriting is handled by `remark-fix-image-paths` at build time

- **Ported Files Log** (`_maintainers/logs/ported-files.log`)
  - Created by `port-content.js` after downloads complete
  - Lists all ported markdown files (one per line, relative to `docs/`, without `.md`/`.mdx` extension)
  - Used by remark plugins to determine which files to process
  - Ensures plugins only process ported content, not the entire docs site
  - Makes the system generic - works for any repository without hardcoded paths

- **Configuration** (`_maintainers/link-replacements.yaml`)
  - Link rewriting rules (exact and pattern-based)
  - Generalized network support via patterns

## Port script execution flow

The `npm run port` command executes a multi-step process defined in `scripts/port-content.js`. 

### Step 1: Load configuration

**Script:** `getRemoteContentPlugins()`  
**Location:** `scripts/port-content.js`

- Parses `docusaurus.config.js` to extract all `docusaurus-plugin-remote-content` plugin configurations
- Extracts plugin metadata:
  - Plugin name (e.g., `metamask-services-index`)
  - Output directory (`outDir`)
  - Source path variables (e.g., `partialsPath`, `gasApiPath`)
  - Expected file counts from `documents` arrays
- Returns array of command objects used in subsequent steps

### Step 2: Download remote content

**Script:** `downloadRemoteContent(commands)`  
**Location:** `scripts/port-content.js`

- Executes `npx docusaurus download-remote-content` for each configured file or folder
- Downloads designated files and images from upstream repositories
- Handles `index.md` files: Automatically renames them to `{plugin-name}-index.md` to avoid conflicts
- Validates, downloads, and reports file counts
- **GitHub API**: Requires `API_TOKEN` or `GITHUB_TOKEN` environment variable for higher rate limits,

**Output:** Downloaded files in directories specified by `outDir` in each plugin configuration

### Step 3: Apply transformations

**Script:** `applyTransformations(commands)`  
**Location:** `scripts/port-content.js`

This step applies source-level transformations to downloaded files **before** they're processed by Docusaurus. The order of operations is critical:

1. **Rename Index Files** (`renameIndexFiles()`)
   - Ensures all `index.md` files are renamed to plugin-specific names
   - Must run before file collection to ensure renamed files are included in logs

2. **For each markdown file:**
   - **Fix Image Paths** (`fixImagePaths()`)
     - Converts relative image paths to Docusaurus-compatible paths
     - Handles both markdown syntax (`![alt](../images/file.png)`) and JSX (`require()` statements)
   
   - **Fix MDX Syntax** (`fixMDXSyntax()`)
     - Adds blank lines after import statements (required for MDX parsing)
     - Normalizes blank lines between imports
     - Comments out unsupported imports: both regular imports and commented imports (HTML comments for `.md`, MDX comments for `.mdx`)
     - **Critical**: Prevents breaking subsequent imports by checking if next line is another import
   
   - **Fix Component Imports** (`fixComponentImports()`)
     - Comments out missing `@site/src/components` and `@site/src/plugins` imports (Uses HTML comment for .md and mdx syntax (`{/* */}`) for `.mdx` files)
     - Adds blank line after commented imports to prevent breaking subsequent imports
     - Removes or comments out component usage in JSX
   
   - **Add Ported Warning** (`addPortedWarning()`)
     - Adds frontmatter warning to `.md` files (not `.mdx`): `warning: this page has been ported from another repository, any edits may be overwritten by running the port script`
     - Ensures blank line after frontmatter closing `---` before content/imports

**Output:** Transformed source files written back to disk

### Step 4: Create ported files log

**Script:** `collectPortedFiles(commands)` → `writePortedFilesLog(portedFiles)`  
**Location:** `scripts/port-content.js`

- **Must run AFTER Step 3** to include renamed index files
- Recursively scans all `outDir` directories for markdown files (`.md` and `.mdx`)
- Converts absolute file paths to relative paths from `docs/` directory
- Removes file extensions (`.md`/`.mdx`) for consistency with Docusaurus path resolution
- Writes to `_maintainers/logs/ported-files.log` (one path per line)

**Purpose:** This log is the source of truth for remark plugins to determine which files to process. It ensures plugins only transform ported content, not the entire site.

### Step 5: Pre-process links (regex-based)

**Script:** `runRemarkPlugins()`  
**Location:** `scripts/port-content.js`

**⚠️ Critical Step - Addresses Docusaurus Link Validation Timing Issue**

This step uses **regex-based replacement** to convert problematic relative links to external URLs **before** Docusaurus validates links. This is necessary due to a timing issue in Docusaurus's build process (see [Docusaurus behavior constraints](#docusaurus-behavior-constraints) below).

**Process:**
1. Loads `ported-files.log` to get list of files to process
2. Loads `link-replacements.yaml` to get `sourceBasePath` (default: `/services`)
3. For each ported file:
   - Reads file content
   - Uses regex pattern to find markdown links with relative paths: `/\[([^\]]*)\]\(((?:\.\.\/)+)?([^\)]+\.md[^\)]*)\)/g`
   - For each relative link:
     - Resolves the path relative to the current file
     - Checks if the target file exists locally
     - If **file does NOT exist locally**: Converts to external URL (`https://docs.metamask.io{sourceBasePath}/{path}`)
     - If **file exists locally**: Keeps as relative link (no change)
   - Writes modified content back to source file

**Why This Step Exists:**
- Docusaurus validates links **before** remark plugins fully process the AST
- This regex step ensures source files have converted links when validation occurs
- The remark plugins (Step 6) still run as a backup and handle more complex cases

**Output:** Source files with converted links written back to disk

### Step 6: Start dev server or build

**Script:** `main()`  
**Location:** `scripts/port-content.js`

- **Default**: Starts Docusaurus dev server (`npm start`)
- **With `--no-server` flag**: Skips dev server (useful for testing)
- **With `--build` flag**: Runs production build (`npm run build`) instead of dev server

**Note:** Remark plugins configured in `docusaurus.config.js` run automatically during this step, providing a backup layer of link rewriting (see [Dual processing strategy](#dual-processing-strategy) below).

## Docusaurus behavior constraints

### Remark plugins run at build time

**Constraint:** Remark plugins are configured in `docusaurus.config.js` and execute during Docusaurus's build process. They cannot run independently or at arbitrary times.

**Implications:**
- Plugins modify the **AST (Abstract Syntax Tree)** during Docusaurus's markdown processing phase
- Link validation happens in a **separate phase** of Docusaurus's build pipeline
- The timing between AST modification and link validation can cause issues

### Link validation timing issue

**Problem:** Docusaurus validates markdown links **before** remark plugins have fully persisted their AST modifications. This creates a race condition:

1. **Markdown parsing phase**: Docusaurus parses markdown files into AST
2. **Remark plugin phase**: Plugins traverse and modify the AST (e.g., rewriting links)
3. **Link validation phase**: Docusaurus validates links **using the original source files**, not the modified AST
4. **Result**: Broken link warnings/errors even though plugins correctly modified the AST

**Evidence:**
- Build warnings for links that plugins successfully converted in the AST
- Links that should be external URLs still appear as relative paths during validation
- Validation occurs before plugins can write changes back to source files

### Solution: Dual processing strategy

The system uses a **dual processing strategy** to handle this timing issue:

#### 1. Regex pre-processing (step 5)

**When:** Runs during `npm run port`, **before** Docusaurus starts  
**What:** Directly modifies source files using regex pattern matching  
**Why:** Ensures converted links exist in source files when Docusaurus validates them

**Advantages:**
- ✅ Source files are modified **before** Docusaurus reads them
- ✅ Link validation sees already-converted external URLs
- ✅ No build warnings for converted links
- ✅ Fast and reliable for common cases

**Limitations:**
- Only handles simple relative path patterns
- Doesn't handle complex AST transformations
- Doesn't support all YAML pattern features (e.g., `extractPath`, network placeholders)

#### 2. Remark plugin processing (step 6)

**When:** Runs during Docusaurus build (via `docusaurus.config.js`)  
**What:** Processes AST using full YAML configuration  
**Why:** Handles complex cases and provides backup for any missed links

**Advantages:**
- ✅ Full access to YAML pattern configuration
- ✅ Supports all pattern features (network placeholders, path extraction, etc.)
- ✅ Handles complex AST transformations
- ✅ Processes links that regex step might miss

**Limitations:**
- ⚠️ Runs **after** initial link validation (but before final build)
- ⚠️ May not prevent all validation warnings
- ⚠️ AST modifications may not persist to source files

**How They Work Together:**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Regex Pre-processing (npm run port)                │
│ ─────────────────────────────────────────────────────────── │
│ • Reads source files                                        │
│ • Finds relative links with regex                           │
│ • Converts to external URLs if file doesn't exist locally   │
│ • Writes modified content back to source files              │
│ • Result: Source files have converted links                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Docusaurus Build Starts                                      │
│ ─────────────────────────────────────────────────────────── │
│ • Reads source files (now with converted links)             │
│ • Parses markdown → AST                                      │
│ • Validates links (sees external URLs ✅)                    │
│ • Remark plugins process AST (backup/conplex cases)          │
│ • Build completes                                            │
└─────────────────────────────────────────────────────────────┘
```

**Result:** 
- Most links are converted by regex step → no validation warnings
- Complex cases handled by remark plugins → comprehensive coverage
- Dual approach ensures reliability

### Known limitations

1. **Comment Syntax**: The config parser respects JavaScript comments (`//` and `/* */`), but this is regex-based, not a full JavaScript parser. Edge cases in comment syntax may not be detected.

2. **File Extension Handling**: The system handles both `.md` and `.mdx` files, but file existence checks must account for both extensions.

3. **Relative Path Resolution**: Complex relative paths (e.g., `../../../concepts/file.md`) require careful depth calculation to determine if they escape the ported data structure.

4. **Build-time Only**: Remark plugins cannot run outside of Docusaurus's build process, so pre-processing must happen in the port script.

> **Note:** The port script (`scripts/port-content.js`) must be in the project root (`scripts/` directory) to work with npm commands.

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

The system handles multiple types of link replacements across different processing stages:

| Type | Tool | Stage | Configuration | Description |
|------|------|-------|--------------|-------------|
| **Component Imports** | `scripts/port-content.js` | Step 3 | None | Comments out missing `@site/src/components` and `@site/src/plugins` imports, handles component usage |
| **MDX Syntax** | `scripts/port-content.js` | Step 3 | None | Fixes MDX syntax issues (adds blank lines after imports, normalizes spacing) |
| **Frontmatter Warnings** | `scripts/port-content.js` | Step 3 | None | Adds warning to `.md` files about ported content |
| **Image Links** | `remark-fix-image-paths` | Build time | `docusaurus.config.js` | Rewrites image paths to `/img/ported-images/{filename}`. Images downloaded via `docusaurus-plugin-remote-content` |
| **Relative Links (Simple)** | `scripts/port-content.js` (regex) | Step 5 | `link-replacements.yaml` | Converts relative paths that don't exist locally to external URLs (regex-based, pre-build) |
| **Relative Links (Complex)** | `remark-link-rewriter` | Build time | `_maintainers/link-replacements.yaml` | Converts relative paths using full YAML pattern matching (AST-based, during build) |
| **Absolute Paths** | `remark-link-rewriter` | Build time | `_maintainers/link-replacements.yaml` | Rewrites absolute paths (starting with `/`) to local paths or external URLs based on YAML patterns |

<details>
  <summary>Examples</summary>

**Relative Links:**
- `../../concepts/websockets.md` → `https://docs.metamask.io/services/concepts/websockets.md` (regex step)
- `concepts/archive-data.md` → `https://docs.metamask.io/services/concepts/archive-data.md` (regex step)

**Absolute Paths (ported networks → local):**
- `/services/reference/base/json-rpc-methods/eth_call` → `/reference/base/json-rpc-methods/eth_call` (remark plugin)
- `/services/reference/ethereum/...` → `/reference/ethereum/...` (remark plugin)

**Absolute Paths (non-ported networks → external):**
- `/services/reference/sei/json-rpc-methods/eth_call` → `https://docs.metamask.io/services/reference/sei/json-rpc-methods/eth_call` (remark plugin)
- `/services/reference/arbitrum/...` → `https://docs.metamask.io/services/reference/arbitrum/...` (remark plugin)

</details>

### Link replacements configuration

Configuration is stored in `_maintainers/link-replacements.yaml`:

```yaml
# Source base path: Used to convert relative paths to absolute paths for pattern matching
sourceBasePath: /services

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

#### Pattern matching constraints

Order matters when setting up the yaml. The plugin loops through patterns in order and stops at the first match:
}
for (const pattern of patterns) {  const match = urlToMatch.match(pattern.regex);  if (match) {    // Apply replacement and BREAK - stops checking other patterns    break;  }}
Why Order Matters: Example
Consider a link: /services/reference/sei/json-rpc-methods/eth_call
❌ Wrong Order (Generic Pattern First)
patterns:  # Generic pattern comes FIRST  - pattern: '/services/reference/([a-z0-9-]+)/.+'    replacement: '/reference/{network}'    extractPath: true    # Specific pattern comes SECOND (never reached!)  - pattern: '/services/reference/(sei|arbitrum|avalanche)/.+'    replacement: 'https://docs.metamask.io/services/reference/{network}'    extractPath: true

What happens:

Link: /services/reference/sei/json-rpc-methods/eth_call
Generic pattern matches first (matches any network name, including "sei")
Converts to: /reference/sei/json-rpc-methods/eth_call (local path)
Stops checking — specific pattern never evaluated
Result: Broken link (sei content doesn't exist locally)
✅ Correct Order (Specific Patterns First)
patterns:  # Specific pattern comes FIRST  - pattern: '/services/reference/(sei|arbitrum|avalanche)/.+'    replacement: 'https://docs.metamask.io/services/reference/{network}'    extractPath: true    # Generic pattern comes SECOND (only matches networks not already handled)  - pattern: '/services/reference/([a-z0-9-]+)/.+'    replacement: '/reference/{network}'    extractPath: true

What happens:
Link: /services/reference/sei/json-rpc-methods/eth_call
Specific pattern matches first (matches "sei")
Converts to: https://docs.metamask.io/services/reference/sei/json-rpc-methods/eth_call (external URL)
Stops checking — generic pattern never evaluated
Result: Working external link

### Pattern syntax

- **Exact matches**: Use `replacements` section for simple path-to-URL mappings
- **Pattern matches**: Use `patterns` section with regex for flexible matching
- **Network placeholders**: Use `{network}` in replacement (extracted from pattern capture group)
- **Path extraction**: Set `extractPath: true` to append remaining path after pattern match
- **Source base path**: `sourceBasePath` defines the base path for converting relative paths to absolute paths for pattern matching

### Plugin import syntax

Remark plugins are imported in `docusaurus.config.js` and applied at build time:

```javascript
remarkPlugins: [
  require("./plugins/remark-link-rewriter"),
  require("./plugins/remark-fix-image-paths"),
],
```

**How plugins determine which files to process:**

1. **Ported files log**: After `npm run port` completes Step 4, `port-content.js` creates `_maintainers/logs/ported-files.log` listing all ported files
2. **Plugin filtering**: Both remark plugins load this log and only process files listed in it
3. **Generic design**: No hardcoded paths - plugins work for any repository by reading the ported files log

**Note:** Component fixes, MDX syntax fixes, and frontmatter warnings are handled by `scripts/port-content.js` during Step 3. Image path rewriting is handled by `remark-fix-image-paths` at build time. Link rewriting uses a dual approach: regex pre-processing (Step 5) and remark plugin processing (build time).

### Adding new networks

To add a new network:

1. **Configure in `docusaurus.config.js`**: Add a new `docusaurus-plugin-remote-content` entry for the network
2. **Update YAML patterns** in `_maintainers/link-replacements.yaml`:

```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
```

3. **Run `npm run port`**: This will download the new network's content and add it to `ported-files.log`

**No code changes needed** - the system is fully generalized. Remark plugins automatically process the new network's files because they're listed in `ported-files.log`.

## Image handling

Images are explicitly configured in `docusaurus.config.js` using `docusaurus-plugin-remote-content`, just like markdown content. Images are downloaded to `static/img/ported-images/` and paths are rewritten by `remark-fix-image-paths` to `/img/ported-images/{filename}`.

## Logging

All transformations are logged to `_maintainers/logs/`:
- `ported-files.log` - List of all ported files (created in Step 4, used by remark plugins)
- `transformation-summary.log` - Summary per run (downloads, transformations applied)
- `links-replaced.log` - Link rewrites applied by `remark-link-rewriter` at build time
- `links-dropped.log` - Removed broken links (from both `port-content.js` and `remark-link-rewriter`)
- `component-import-fixes.log` - Removed/commented component/plugin imports
- `image-operations.log` - Image path fixes
- `build-errors.log` - Build and download errors

**Note:** Link rewrites from `remark-link-rewriter` are applied at build time and logged by the plugin itself. The `ported-files.log` is created by `port-content.js` in Step 4 and used by remark plugins to determine which files to process.

## Usage

### Port content

```bash
npm run port
```

This command executes all 6 steps:
1. **Step 1**: Loads plugin configurations from `docusaurus.config.js`
2. **Step 2**: Downloads content and images via `docusaurus-plugin-remote-content`
3. **Step 3**: Applies transformations (MDX syntax, component imports, frontmatter warnings)
4. **Step 4**: Creates `_maintainers/logs/ported-files.log` listing all ported files
5. **Step 5**: Pre-processes links using regex (converts relative paths to external URLs)
6. **Step 6**: Starts dev server (unless `--no-server` or `--build` flag is used)

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

## Testing

The system includes a small test suite for remark plugins:

### Running tests

```bash
npm test
```

### Test files

- **`plugins/__tests__/remark-link-rewriter.test.js`**
  - Tests link rewriting logic with YAML configuration
  - Mocks file system and YAML loading
  - Tests pattern matching, network placeholders, path extraction
  - Tests file existence checking and link conversion
  - Validates logging output

- **`plugins/__tests__/remark-fix-image-paths.test.js`**
  - Tests image path rewriting for both markdown and JSX syntax
  - Tests handling of multiple `../` levels
  - Validates path conversion to Docusaurus-compatible paths

### Test configuration

Tests use Jest with Babel for ES module support. Configuration files:
- `jest.config.js` - Jest configuration
- `.babelrc` - Babel configuration for test transformation

**Note:** Tests are currently specific to the MetaMask MVP example but validate the generic plugin logic.

## Error handling

Errors are logged to `_maintainers/logs/build-errors.log`. Common issues:
- Missing config: Plugin uses defaults
- Invalid YAML: Error logged, defaults used
- Invalid regex: Pattern skipped
- Image/download failures: Logged, build continues
- GitHub rate limits: Set `API_TOKEN` for higher limits

## Troubleshooting

- **Links not rewriting**: 
  - Check `_maintainers/link-replacements.yaml` and verify patterns match your paths
  - Verify file is in `ported-files.log` (plugins only process listed files)
  - Check if link was converted by regex step (Step 5) or remark plugin (build time)
  - Review `_maintainers/logs/links-replaced.log` for applied rewrites

- **Build warnings for converted links**: 
  - This indicates the regex pre-processing step (Step 5) may have missed the link
  - The remark plugin should handle it during build, but warnings may still appear
  - Check `_maintainers/logs/links-replaced.log` to confirm plugin processed the link

- **Images not working**: 
  - Verify images are configured in `docusaurus.config.js` (see [Image handling](#image-handling))
  - Check `_maintainers/logs/image-operations.log` for image path fixes
  - Ensure images were downloaded: `npx docusaurus download-remote-metamask-images`

- **Build failing**: 
  - Check `_maintainers/logs/build-errors.log` and verify YAML syntax
  - Verify `ported-files.log` exists and contains expected files
  - Check that Step 4 ran after Step 3 (renamed index files must be in log)

- **GitHub rate limits**: 
  - Set `API_TOKEN` (or `GITHUB_TOKEN`) in `.env` file for higher rate limits (5000/hour)

- **Component errors**: 
  - Check `_maintainers/logs/component-import-fixes.log` to see which imports were commented out
  - Verify comment syntax matches file type (HTML comments for `.md`, MDX comments for `.mdx`)

- **MDX compilation errors**: 
  - The script fixes common MDX syntax issues (blank lines after imports)
  - Check that imports have proper blank lines after them
  - Verify commented imports don't break subsequent imports

- **TabItem or other theme components not defined**: 
  - Check that imports from `@theme/` are not being commented out (only `@site/src/components` should be commented)
  - Verify blank lines exist after commented imports
  - Check that file extension matches comment syntax (`.md` uses HTML comments, `.mdx` uses MDX comments)

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

For non-ported files that are only in the upstream, links should point to the source docs:

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
