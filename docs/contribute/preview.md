---
description: Preview your documentation changes before submitting them.
sidebar_position: 6
---

# Preview the docs

You can preview your documentation changes locally before pushing them to your
remote branch.
As a prerequisite, make sure you have the following installed:

- [Node.js](https://nodejs.org) version 16+

  :::tip
  If you're using [nvm](https://github.com/creationix/nvm#installation) (recommended), run
  `nvm use` to automatically choose the right Node.js version.
  :::

- [Yarn](https://yarnpkg.com/getting-started/install) version 3

In the doc repository, run `yarn install` to install dependencies and run any required post-install scripts.
Run `yarn start` and preview your changes at `localhost:3000`.

:::note
If you make changes to the
[redirects](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-client-redirects), you can
preview them by running `yarn build && yarn serve`.
:::
