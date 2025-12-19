# Scripts Directory

Scripts are organized by purpose:

## Directory Structure

- **`pipeline/`** - Local development and build pipeline scripts
  - `port-content.js` - Downloads and transforms MetaMask content for local development
  
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

### CI Scripts

These are typically called from GitHub Actions workflows:
```bash
node scripts/ci/sync-metamask-content.js
```

## Environment Variables

Scripts load environment variables from `.env` file in the project root:
- `GITHUB_TOKEN` or `API_TOKEN` - GitHub API token for higher rate limits

