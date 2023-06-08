---
description: Preview your documentation changes before submitting them.
sidebar_position: 6
---

# Preview the docs

You can preview your documentation changes locally before pushing them to your
remote branch.

Make sure you have [Node.js version 16+ and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
installed.

:::tip
If you're using nvm (recommended), run `nvm use` to automatically choose the right Node.js version.
:::

Use [npm](#npm) or [Yarn](#yarn) to preview the docs locally.

## npm

In the doc repository, run the following commands to start a local development server and preview
your changes:

```bash
npm install
npm run prepare
npm start
```

:::note
If you make changes to the [redirects](configure-docusaurus.md#redirects), you can preview them by
running `npm run build && npm run serve`.
:::

## Yarn

Make sure you have [Yarn](https://yarnpkg.com/getting-started/install) version 3 installed.

In the doc repository, run the following commands to start a local development server and preview
your changes:

```bash
yarn install
yarn start
```

:::note
If you make changes to the [redirects](configure-docusaurus.md#redirects), you can preview them by
running `yarn build && yarn serve`.
:::
