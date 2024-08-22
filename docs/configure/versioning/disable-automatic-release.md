---
sidebar_position: 3
---

# Disable automatic semantic release

By default, this template repository includes the [`semantic-release`](../../create/repo-structure.md#-releasercjs)
package to automatically create releases in GitHub once a push or pull request is merged into the
`main` branch.

You may or may not want to disable `semantic-release` for the following reasons:

:::caution Reasons to disable `semantic-release`

- You want to manually release in line with your application's release cycle and match
  the application's versioning.
- Releases are not necessary at all for your docs.
  In this case, you can remove it completely and only maintain version control in GitHub.

:::

:::info Reasons to not disable `semantic-release`

- Since Docusaurus handles all docs versioning, it should not normally be necessary to release
  manually to match your application release cycle.
- Locking the release of the docs to the application makes it more difficult to amend
  versions after the fact.
  With `semantic-release`, the releases are more flexible and relies on Docusaurus versioning
  for different application versions.

:::

## Disable `semantic-release`

1. Remove `semantic-release` from `package.json`:

   ```bash
   npm uninstall @semantic-release/changelog @semantic-release/commit-analyzer \
   @semantic-release/git @semantic-release/github @semantic-release/npm \
   @semantic-release/release-notes-generator
   ```

2. Delete the `semantic-release` configuration file:

   ```bash
   rm .releaserc.js
   ```

3. Set the default value for the `release.yaml` action to `false`:

   ```yaml title="release.yaml"
   inputs:
     semantic_release:
       description: "whether to use semantic-release"
       required: false
       default: false
   ```

4. _(Optional)_ You can also remove the `release.yaml` workflow entirely
  if you don't need it.
