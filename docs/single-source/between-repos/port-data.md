---
title: How it works
---

# Porting Data Between Repositories

This guide explains how the porting of content from upstream repositories (like MetaMask docs) to this documentation site using a hybrid approach that combines runtime plugins and their helper scripts.

## Overview

1. **Runtime Plugins** - Transform content at build time using remark/rehype plugins
2. **Helper scripts** - Support for the plugins


> There is no liveliness to the data. Only when `npm run port` is run will upstream changes be ported. This provides explicit reviewable changes and the ability to revert even after merge. However, it also requires lots of custom rewiring making the solution brittle.

## Architecture

### Data Flow

1. **CI Workflow** detects changes in upstream repository
2. **Sync Script** downloads content and applies transformations
3. **PR Created** with transformed content for review
4. **After Merge** - Build-time plugins apply final transformations
5. **Published Site** with fully transformed content

### Components

- **Remark Plugins** (`plugins/`)
  - `remark-link-rewriter` - Rewrites links based on YAML config
  - `remark-fix-image-paths` - Fixes image paths for Docusaurus

- **Configuration** (`_maintainers/link-replacements.yaml`)
  - Link rewriting rules
  - Supports exact replacements and pattern-based replacements
  - Generalized network support (1 or 20+ networks)

- **CI Workflow** (`.github/workflows/sync-metamask-content.yml`)
  - Runs daily at noon UTC
  - Creates/updates PRs with transformed content

- **Sync Script** (`scripts/sync-metamask-content.js`)
  - Downloads content from upstream
  - Handles image detection and download
  - Applies transformations

## Configuration

### Link Replacements

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

- **Exact matches**: Use `replacements` section
- **Pattern matches**: Use `patterns` section with regex
- **Network placeholders**: Use `{network}` in replacement (extracted from pattern capture group)
- **Path extraction**: Set `extractPath: true` to append remaining path after pattern match

### Adding New Networks

To add a new network, simply update the YAML patterns:

```yaml
patterns:
  - pattern: '/services/reference/new-network/.+'
    replacement: '/reference/new-network'
    extractPath: true
    description: 'Rewrite links for new-network'
```

No code changes needed - the system is fully generalized.

## Image Handling

### Workflow

1. **Detection**: Parse markdown/MDX to find all image references
   - Markdown: `![alt](../images/file.png)`
   - JSX: `src={require("../images/file.png").default}`
   - Require: `require("../images/file.png")`

2. **Download**: For each detected image
   - Check if exists in `static/img/`
   - If not, download from upstream (GitHub raw URL)
   - Save to `static/img/{filename}`

3. **Link Rewriting**: After download, rewrite all image references
   - `../images/file.png` → `/img/file.png`
   - `require("../images/file.png")` → `require('@site/static/img/file.png')`

4. **Error Handling**: Failed downloads are logged but don't fail the build

### Image Locations

Images are searched in this order:
1. `{sourceDir}/images/{filename}`
2. `{sourceDir}/../images/{filename}`
3. `services/images/{filename}`

## Logging System

All transformation operations are logged to `_maintainers/logs/`:

### Log Files

- **`links-replaced.log`** - All links that were rewritten (original → new)
- **`links-dropped.log`** - Links that were removed (broken/unmatched)
- **`image-operations.log`** - Image downloads, path rewrites, errors
- **`image-errors.log`** - Failed image downloads, missing files
- **`build-errors.log`** - Build-time errors from plugins
- **`transformation-summary.log`** - Summary of all transformations per build

### Log Format

```
[2025-01-15T12:00:00.000Z] REPLACED: "/old/path" -> "/new/path" (pattern description)
[2025-01-15T12:00:00.000Z] ERROR: Failed to download image.png: 404 Not Found
```

## CI Sync Workflow

### How It Works

1. **Scheduled Run**: Daily at noon UTC
2. **Detect Changes**: Check upstream repository for new commits
3. **Download Content**: Fetch specified files/folders
4. **Apply Transformations**: Run plugins on content
5. **Download Images**: Handle all image references
6. **Create/Update PR**: Open PR with transformed content

### PR Details

- **Title**: `chore: sync MetaMask services content [YYYY-MM-DD]`
- **Body**: Includes change summary, links to logs, review notes
- **Branch**: `sync-metamask-content-{timestamp}`

### Reviewing Sync PRs

1. **Review the diff** - Check that transformations are correct
2. **Check logs** - Review `_maintainers/logs/` for details
3. **Verify images** - Ensure images are properly downloaded
4. **Merge or revert** - Merge if approved, or revert if needed

### Reverting After Merge

Even after a sync PR is merged, you can revert it:

```bash
# Find the merge commit
git log --oneline --grep="sync MetaMask"

# Revert the commit
git revert <commit-hash>
```

The PR remains in history as a reviewable record.

## Manual Sync

To manually trigger a sync:

```bash
# Set GitHub token (required)
export GITHUB_TOKEN=your_token_here

# Run sync script
node scripts/sync-metamask-content.js
```

Or trigger via GitHub Actions UI:
1. Go to Actions tab
2. Select "Sync MetaMask Content" workflow
3. Click "Run workflow"

## Error Handling

### Build-Time Errors

All errors during build are logged to `_maintainers/logs/build-errors.log` with:
- Error message
- Stack trace
- File path (if applicable)
- Timestamp

The build will **fail gracefully** - errors are logged but don't crash the build process.

### Common Errors

1. **Missing config file**: Plugin uses defaults (no transformations)
2. **Invalid YAML**: Error logged, plugin uses defaults
3. **Invalid regex pattern**: Error logged, pattern skipped
4. **Image download failure**: Error logged, build continues
5. **Network errors**: Error logged, build continues

### Error Recovery

- Check `_maintainers/logs/build-errors.log` for details
- Fix configuration issues in `_maintainers/link-replacements.yaml`
- Re-run sync or build after fixes

## Test Cases

Comprehensive test coverage is provided for all plugins. See test files:

- `plugins/__tests__/remark-link-rewriter.test.js`
- `plugins/__tests__/remark-fix-image-paths.test.js`

### Running Tests

```bash
npm test
```

### Test Coverage

Tests cover:
- Link rewriting (exact and pattern matches)
- Network placeholder extraction
- Image path fixes
- External URL handling
- Anchor link handling
- Error handling (missing config, malformed YAML, invalid regex)
- Logging verification

### Adding New Tests

1. Add test case to appropriate test file
2. Follow existing test patterns
3. Run `npm test` to verify
4. Update this documentation if needed

## Troubleshooting

### Links Not Rewriting

1. Check `_maintainers/link-replacements.yaml` exists
2. Verify pattern matches your link format
3. Check `_maintainers/logs/links-replaced.log` for details
4. Ensure pattern uses correct regex syntax

### Images Not Downloading

1. Check `_maintainers/logs/image-errors.log` for failures
2. Verify image exists in upstream repository
3. Check image path in source content
4. Ensure `static/img/` directory exists

### Build Failing

1. Check `_maintainers/logs/build-errors.log`
2. Verify YAML syntax is correct
3. Check for invalid regex patterns
4. Ensure all dependencies are installed (`npm install`)

### PR Not Creating

1. Check GitHub Actions workflow logs
2. Verify `GITHUB_TOKEN` is set
3. Check for merge conflicts
4. Verify branch permissions

## Best Practices

1. **Review PRs carefully** - Check diffs and logs before merging
2. **Test locally first** - Run sync script manually before relying on CI
3. **Keep logs clean** - Regularly review and archive old logs
4. **Update patterns** - Add new patterns as needed for new networks
5. **Document changes** - Update this guide when adding new features

## Examples

### Example: Adding Base Network

1. Update `_maintainers/link-replacements.yaml`:
```yaml
patterns:
  - pattern: '/services/reference/base/.+'
    replacement: '/reference/base'
    extractPath: true
```

2. Update `scripts/sync-metamask-content.js`:
```javascript
{
  sourcePath: "services/reference/base/json-rpc-methods",
  targetPath: "docs/single-source/between-repos/reference/base/json-rpc-methods",
  isDirectory: true,
}
```

3. Run sync and review PR

### Example: Preserving External Links

For networks not ported, preserve full MetaMask URLs:

```yaml
patterns:
  - pattern: '/services/reference/sei/.+'
    replacement: 'https://docs.metamask.io/services/reference/sei'
    extractPath: true
```

## Support

For issues or questions:
- Check logs in `_maintainers/logs/`
- Review test cases for examples
- Check GitHub Actions workflow logs
- Open an issue in the repository

