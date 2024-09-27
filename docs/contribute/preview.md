---
description: Preview your documentation changes before submitting them.
sidebar_position: 5
---

# Preview the docs

Use [npm](#npm) to preview your documentation changes locally before pushing them to your remote branch.
Make sure you have [Node.js version 18+ and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
installed.

:::tip
If you're using Node.js with [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md)
(recommended), run `nvm use` to automatically choose the right Node.js version.
:::

:::note
If you make changes to a versioned doc site (for example, [Teku](https://docs.teku.consensys.net/)),
the changes only appear in the development version of the docs.
Switch to the development version of the preview to see those changes.
:::

## Use npm

In the root of the doc project, run the following commands to start a local development server and preview
your changes:

```bash
npm install
npm start
```

:::note
If you make changes to the [redirects](../create/configure-docusaurus.md#redirects), you can preview them by
running `npm run build && npm run serve`.
:::
