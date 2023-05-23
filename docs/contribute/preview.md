---
description: Preview your documentation changes before submitting them.
sidebar_position: 6
---

# Preview the docs

As a prerequisite, make sure you have the following installed:

- [Node.js](https://nodejs.org) version 16+
  - If you're using [nvm](https://github.com/creationix/nvm#installation) (recommended), running
    `nvm use` automatically chooses the right Node.js version for you.
- [Yarn](https://yarnpkg.com/getting-started/install) version 3
  - Run `yarn install` to install dependencies and run any required post-install scripts.

Preview your changes locally by running `yarn start` in the documentation repository.

> **Note:** If you make changes to the
[redirects](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-client-redirects), you can
preview them by running `yarn build && yarn serve`.
