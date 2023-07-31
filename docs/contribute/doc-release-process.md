---
description: Release process for documentation that uses a versioning system.
sidebar_position: 8
---

# Documentation release process

The following instructions are for documentation that uses the Docusaurus versioning system.

:::info
Currently, only the Teku documentation utilizes versioning, supporting just two versions: `stable` and `development`.
This means previous releases must be removed as part of the release process.
:::

A new stable version of the documentation is released when a new version of the software is released.
In the following example we'll release the `23.6.3` version of the documentation (from `23.6.2`).

## Steps

You'll need to create a documentation pull request with the following changes:

### 1. Create a new version of the documentation:
 
Create a new documentation version by running the following command:

<!--tabs-->

# Syntax

```bash
npm run docusaurus docs:version <VERSION-NUMBER>
```

# Example

```bash
npm run docusaurus docs:version 23.6.3
```

<!--/tabs-->

This command:

- Copies the full `docs/` directory into a new `version-<VERSION-NUMBER>` directory in the `versioned_docs` directory.
- Creates a new `versioned_sidebars/version-<VERSION-NUMBER>-sidebars.json` file
- Appends the new version number to the `versions.json` file.

### 2. Update the `docusaurus.config.js` file

In `docusaurus.config.js`, under `presets` > `classic` > `docs`:

- Update the `lastVersion` to the new version number.
- Under `versions`, update the current stable version to the new version

For example, when releasing version `23.6.3` (from `23.6.2`), update the following section in the `docusaurus.config.js`
file by updating the version number:

```javascript
presets: [
  [
    "classic",
    {
      docs: {
        sidebarPath: require.resolve("./sidebars.js"),
        // Set a base path separate from default /docs
        editUrl: "https://github.com/ConsenSys/doc.teku/tree/master/",
        routeBasePath: "/",
        path: "./docs",
        includeCurrentVersion: true,
        // highlight-next-line
        lastVersion: "23.6.3",
        versions: {
          //defaults to the ./docs folder
          // using 'development' instead of 'next' as path
          current: {
            label: "development",
            path: "development",
          },
          //the last stable release in the versioned_docs/version-stable
          // highlight-start
          "23.6.3": {
            label: "stable (23.6.3)",
          },
          // highlight-end
        },
...
],

```

### 3. Update the `versions.json` file

Delete the previous version from the `versions.json` file:

Before:

```json
[
  "23.6.3",
  "23.6.2"
]
```

After:

```json
[
  "23.6.3"
]
```

### 4. Delete the previous doc versions

Lastly, we'll cleanup the documentation directory by deleting the previous stable docs. For this example it means:

1. In the `versioned_docs` directory, delete the `version-23.6.2` folder
2. In the `versioned_sidebars` directory, delete the `version-23.6.2-sidebars.json` file.

Create your pull request. You can perform a final check using the Preview link that gets created for your PR.