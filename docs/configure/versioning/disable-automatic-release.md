---
sidebar_position: 3
---

# Disable automatic semantic release

By default, this repo includes [`semantic-release`](../../create/repo-structure.md)
package to automatically create releases in GitHub once a push or PR has been merged into `main` branch.

## Rationale for _not disabling_ semantic release

Since Docusaurus handles all documentation versioning, it should not normally be
necessary to release manually to match your application release cycle.
Locking the release of the documentation to the application may also make it
much more difficult to amend those versions after the fact.
With the way it is set up now, the releases are more flexible and relies on
Docusaurus versioning for different application versions.

## Potential reasons to disable

You may want to disable this if you want to manually release in line with your
application's release cycle and match the application's versioning.

Or, if you feel that releases are not necessary at all for your documentation,
then you can remove it completely and only maintain version control in GitHub.

## Steps to disable semantic-release

1. Remove `semantic-release` from your `package.json`

   ```bash
   npm uninstall @semantic-release/changelog @semantic-release/commit-analyzer @semantic-release/git @semantic-release/github @semantic-release/npm @semantic-release/release-notes-generator
   ```

2. Delete configuration file as it is no longer needed

   ```bash
   rm .releaserc.js
   ```

3. Set the default value for the `release.yaml` action to `false`:

   ```yaml
   inputs:
     semantic_release:
       description: "whether to use semantic-release"
       required: false
       default: false
   ```

4. _(Optional)_ You can also choose to remove the `release.yaml` workflow entirely if it is unneeded.
