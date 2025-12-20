# Scripts Directory

Scripts are organized by purpose:

## Directory Structure

- **`pipeline/`** - Local development and build pipeline scripts
  - `port-content.js` - Downloads and transforms remote content (configured in docusaurus.config.js) for local development
  - `port-with-timeout.sh` - Wrapper script to run port with process-level timeout (useful for CI or long-running operations)
  
- **`ci/`** - CI/CD workflow scripts (for GitHub Actions)
  - `sync-metamask-content.js` - Automated sync script for CI workflows

## Usage

### Pipeline Scripts

Run via npm commands:
```bash
npm run port              # Run port-content.js
npm run port -- --build   # Run port with build check
npm run port -- --no-server  # Run without starting dev server
```

Or use the shell wrapper with process-level timeout:
```bash
./scripts/pipeline/port-with-timeout.sh 600 --build  # 10 minutes timeout with build check
./scripts/pipeline/port-with-timeout.sh 300          # 5 minutes timeout (default)
```

**Note:** The shell script provides a process-level timeout for the entire `npm run port` execution. Individual commands within `port-content.js` have their own timeouts (see `COMMAND_TIMEOUT_MS` in `port-content.js`).

### CI Scripts

These are typically called from GitHub Actions workflows:
```bash
node scripts/ci/sync-metamask-content.js
```

## Environment Variables

Scripts load environment variables from `.env` file in the project root:
- `GITHUB_TOKEN` or `API_TOKEN` - GitHub API token for higher rate limits

