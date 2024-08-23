---
description: Support and manage multiple documentation versions.
sidebar_position: 1
---

# Configure and use versioning

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Docusaurus can manage multiple versions of your documentation.
See the [Docusaurus versioning documentation](https://docusaurus.io/docs/next/versioning) for
detailed context and instructions on managing versions.

The following instructions are for documentation that uses n versions that can be accessed like so:

| Path                                | Version        | URL                |
|:-----------------------------------  |:-------------  |:-------------------|
|versioned_docs/version-0.x/hello.md   | 0.x            | /0.x/hello        |
|versioned_docs/version-1.0/hello.md   | 1.0 (latest)   |  /hello             |
|docs/hello.md                         | development    |  /development/hello |

:::info
Please note that unlike Read the Docs (RTD) that versions by tags on the code base, in Docusaurus,
every version in history is kept in the `versioned_docs` folder, so the onus is on you to remove
older versions when required
:::

Docusaurus nomenclature is slightly different to what we use. In docusaurus, all actual versions
are referred to by name and are sub folders in `versioned_docs`; and the next version is therefore called
`next` (the next version). In Consensys we follow the same for the `versioned_docs` but use the
term `development` instead, and this can be configured in docusaurus.config.js like so, where
the `current` version is given a `label` and `path` attribute.

```js
...
    routeBasePath: "/",
    path: "./docs",
    includeCurrentVersion: true,
    lastVersion: "1.0",
    versions: {
      //defaults to the ./docs folder
      // using 'development' instead of 'next' as path
      current: {
        label: "development",
        path: "development",
      },
      //the last stable release in the versioned_docs/version-stable
      "1.0": {
        label: "1.0",
      },
      "0.x": {
        label: "0.x",
      },
    },
...
```

## Release a new docs version

### 1. Create a new version of the documentation

In the following steps, we'll release the `1.0` version of the documentation (`./docs`) as an example.

<Tabs>
  <TabItem value="Syntax" label="Syntax">

    <!-- markdownlint-disable -->

    ```bash
    npm run docusaurus docs:version <VERSION-NUMBER>
    ```

    <!-- markdownlint-restore -->


    This command:

    - Copies the full `docs/` directory into a new `version-<VERSION-NUMBER>` directory in 
      the `versioned_docs` directory.
    - Creates a new `versioned_sidebars/version-<VERSION-NUMBER>-sidebars.json` file.
    - Appends the new version number to the `versions.json` file.

  </TabItem>
  <TabItem value="Example" label="Example">

    <!-- markdownlint-disable -->

    ```bash
    npm run docusaurus docs:version 1.0
    ```

    <!-- markdownlint-restore -->

    This command:

    - Copies the full `docs/` directory into a new `version-1.0` directory in the `versioned_docs` directory.
    - Creates a new `versioned_sidebars/version-1.0-sidebars.json` file.
    - Appends the new version number to the `versions.json` file.

  </TabItem>
</Tabs>

Your docs now have two versions:

- `1.0` at `http://localhost:3000/` for the version 1.0 docs
- `current` at `http://localhost:3000/next/` for the upcoming, unreleased docs.

### 2. Update the `docusaurus.config.js` file to re-label these paths

In `docusaurus.config.js`, under `presets` > `classic` > `docs`:

- Update the `lastVersion` to the new version number.
- Under `versions`, update the current version to the new version.

For example, when releasing version `1.0`, update the following section in the `docusaurus.config.js`
file by updating the version number:

```js
presets: [
  [
    "classic",
    {
      docs: {
        sidebarPath: require.resolve("./sidebars.js"),
        // Set a base path separate from default /docs
        editUrl: "https://github.com/consensys/doc.teku/tree/master/",
        routeBasePath: "/",
        path: "./docs",
        includeCurrentVersion: true,
        // highlight-next-line
        lastVersion: "1.0",
        versions: {
          //defaults to the ./docs folder
          // using 'development' instead of 'next' as path
          current: {
            label: "development",
            path: "development",
          },
          //the last stable release in the versioned_docs/version-1.0
          // highlight-start
          "1.0": {
            label: "1.0",
          },
          // highlight-end
        },
...
],

```

### 3. Update the `versions.json` file

:::info
Please remember to remove any old versions that you are not required in this file
:::

```json
[
  "1.0",
  "0.x"
]
```

### 4. Delete the previous doc versions (if needed)

If you have deleted a version in step 3, also delete the artifacts for that version. For example,
if deleting version `0.2` that would mean deleting the following:

1. In the `versioned_docs` directory, delete the `version-0.2` folder
2. In the `versioned_sidebars` directory, delete the `version-0.2-sidebars.json` file.

Create your pull request. You can perform a final check using the preview link generated for your PR.

### 5. Add a version dropdown (Do this once only when versioning is introduced)

To navigate seamlessly across versions, add a version dropdown by modifying `docusaurus.config.js`
as follows:

```js title="docusaurus.config.js"
module.exports = {
  themeConfig: {
    navbar: {
      items: [
        // highlight-start
        {
          type: "docsVersionDropdown",
        },
        // highlight-end
      ],
    },
  },
};
```

The docs version dropdown appears in your navbar:

<p align="center">

![Docs Version Dropdown](../img/docsVersionDropdown.png)

</p>

## Update an existing version

You can edit versioned docs in their respective folder:

- `versioned_docs/version-1.0/hello.md` updates `http://localhost:3000/docs/hello`.
- `docs/hello.md` updates `http://localhost:3000/docs/development/hello`.
