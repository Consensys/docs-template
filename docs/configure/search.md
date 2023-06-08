---
description: Enable search using Algolia.
sidebar_label: Search
sidebar_position: 2
---

# Configure search

Docusaurus has official support for [Algolia Search](https://docusaurus.io/docs/search#using-algolia-docsearch) as the primary method of integrating search into docs.

We have an [open-source account](https://docsearch.algolia.com/docs/who-can-apply/) with [Algolia](https://www.algolia.com/) to hold the indexes for our documentation but it is limited to **only** open-source projects (not just the documentation but the originating source code). If your project does not have any source code (general guidelines or tutorials), then it will satisfy the conditions as long as the documentation is open-source.

:::tip

This template repo assumes that the project and its source code is open-source, so it is set up out of the box to be able to integrate Algolia directly.

Please follow the additional instructions below on how to set up local search to avoid an index if you do not satisfy those conditions.

:::

## Docs and source code is open-source

Join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY) Slack channel and ask for Algolia search integration for your docs site. Make sure to provide details of your project so that we can determine whether you are eligible for the Algolia account.

We will get back to you with the `appId`, `apiKey` (it's ok to expose this) and your `indexName`.

You will need to fill those three fields in your `docusaurus.config.js` as shown below.

```js {7-10} title="docusaurus.config.js"
const config = {
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        // The application ID provided by Algolia
        appId: "NSRFPEJ4NC", # // cspell:disable-line
        // Public API key: it is safe to commit it
        apiKey: "cea41b975ad6c9a01408dfda6e0061d3",
        indexName: "docs-template", // Ping #documentation on Slack for your index name
      },
    }),
};
```

Add the [algolia-search-scraper](../../.github/workflows/algolia-search-scraper.yml) to your repo and include an environment 'algolia' with secrets for APPLICATION_ID and API_KEY. Edit the `docs` index in the file to match your repo's index in Algolia. This workflow will run in the background and populate the index that algolia uses to search.

## Source code is not open-source

Unfortunately, if your project does not satisfy the [checklist](https://docsearch.algolia.com/docs/who-can-apply/) then we cannot use Algolia (for free).

In this scenario, there are two options:

1. Make a decision with your team and team lead whether there is [budget](https://www.algolia.com/pricing/) for integrating Algolia Search
2. Install a [local search plugin](https://github.com/easyops-cn/docusaurus-search-local) and do not use Algolia

If you decide on _option 1_ and have obtained Finance approval, then you can follow the steps from above and contact us with this information.

If you decide on _option 2_, you can easily install the [local search plugin](https://github.com/easyops-cn/docusaurus-search-local). However, please note there are some small caveats.

- Local search means that at build-time this is part of the build. For very large documentation sites there may be some marginal performance deficits and additional size to the bundle. Usually, it would require the docs site to be **very large** before it is even a consideration.
- Search will not work when running in a dev environment (`npm run start`). You must `npm run build` and `npm run serve` locally to get the local search to work.

### Steps to install plugin for local search

1. `cd` into the root of your repository where your `package.json` is located
2. Install the plugin with `npm`

```bash
npm i @easyops-cn/docusaurus-search-local
```

3. Remove the `algolia` key entirely under `config > themeConfig`.

   ```js title="DELETE ME in docusaurus.config.js"
   algolia: {
     // The application ID provided by Algolia
     appId: "NSRFPEJ4NC", # // cspell:disable-line
     // Public API key: it is safe to commit it
     apiKey: "cea41b975ad6c9a01408dfda6e0061d3",
     indexName: "docs-template", // Ping #documentation on Slack for your index name
     // Optional: see doc section below
     contextualSearch: true,
     // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
     externalUrlRegex: "external\\.com|domain\\.com",
     // Optional: Algolia search parameters
     searchParameters: {},
     // Optional: path for search page that enabled by default (`false` to disable it)
     searchPagePath: "search",
     // ... other Algolia params
   },
   ```

   This is to ensure that Algolia search bar is overridden by the plugin.

4. Apply the config options for the local plugin, like below under `config > themes` in `docusaurus.config.js`:

   ```js
   themes: [
     [
       require.resolve("@easyops-cn/docusaurus-search-local"),
       /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
       ({
         hashed: true,
         docsRouteBasePath: "/",
         indexBlog: false,
       }),
     ],
   ],
   ```

:::tip

You can find more options that you supply the plugin for your needs [here](https://github.com/easyops-cn/docusaurus-search-local#theme-options).

:::
