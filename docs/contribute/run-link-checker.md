---
description: Run the link checker
sidebar_position: 8
---

# Run the link checker

The documentation suite uses [Linkspector](https://github.com/UmbrellaDocs/linkspector) as the link checker.
Linkspector is integrated into the continuous integration (CI) pipeline and is executed on each pull request (PR) using a GitHub action.

:::info important
The Linkspector GitHub workflow runs on all Markdown files in the repository, not only the ones you've updated.
Failures in the workflow won't prevent your PR from being merged.
:::

## Run locally

Run Linkspector locally to view issues before pushing your changes to GitHub:

1. Install Linkspector locally:

    ```bash
    npm install -g @umbrelladocs/linkspector
    ```

2. Navigate into the documentation directory you want to check.

3. Run Linkspector:

    ```bash
    linkspector check
    ```

## Configure the link checker

Linkspector looks for a configuration file named `.linkspector.yml` in the current directory.
If your site doesn't have this file, the local Linkspector check will use the default configuration,
and the Linkspector GitHub action will fall back to the configuration file in [`Consensys/github-actions`](https://github.com/Consensys/github-actions/blob/main/docs-link-check/config/.linkspector.yml).

You can add or update the `.linkspector.yml` file in the root of your documentation site with specific configuration options.
For example:

```yml title="doc.din/.linkspector.yml"
dirs:
  - ./docs
excludedDirs:
  - ./build
  - ./.vercel
  - ./.docusaurus
  - ./node_modules
useGitIgnore: true

ignorePatterns:
  - pattern: "^/img/"
  - pattern: "^/static/"
  - pattern: "^/llms\\.txt$"
  - pattern: "^/llms-full\\.txt$"
  - pattern: "^http(s)?://localhost"
  - pattern: "^http(s)?://127.0.0.1"
  - pattern: "^http(s)?://docs\\.eigencloud\\.xyz"

aliveStatusCodes:
  - 200
  - 201
  - 204
  - 206
```

Learn more about how to [configure Linkspector](https://github.com/UmbrellaDocs/linkspector?tab=readme-ov-file#configuration).
