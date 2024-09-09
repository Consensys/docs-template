---
description: Configure search using Algolia.
sidebar_label: Search
sidebar_position: 2
---

# Configure search

Docusaurus has [official support for Algolia](https://docusaurus.io/docs/search#using-algolia-docsearch)
as the primary method of integrating search into documentation.

Consensys has an [open-source account](https://docsearch.algolia.com/docs/who-can-apply/) with
[Algolia](https://www.algolia.com/) to hold the indexes for our documentation, but it's limited to
only open-source projects (not just the docs but also the originating source code).
If your project doesn't have any source code (general guidelines or tutorials), then it satisfies
the conditions as long as the docs are open source.

This page contains instructions for configuring Algolia for both open-source closed-source projects.

## For an open source codebase

Follow these steps to configure Algolia in your project:

1. Join the [**#documentation**](https://consensys.slack.com/archives/C0272B5P1CY) channel on Consensys
   Slack and ask for Algolia search integration for your doc site.
   Provide details of your project so we can determine whether you're eligible for the Algolia account.

2. We will get back to you with the `appId`, `apiKey` (it's ok to expose this), and your `indexName`.
   Fill those three fields in `docusaurus.config.js`:

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

3. Add the [`algolia-search-scraper`](../../.github/workflows/algolia-search-scraper.yml) to your
   repository and include an environment `algolia` with secrets for `APPLICATION_ID` and `API_KEY`.
   Edit the `docs` index in the file to match your repository's index in Algolia.
   This workflow runs in the background and populates the index that Algolia uses to search.

## For a close source code base

If your project doesn't satisfy the [Algolia checklist](https://docsearch.algolia.com/docs/who-can-apply/),
then you can't use Algolia for free.

You have two options to configure search:

1. Decide if your team has a [budget](https://www.algolia.com/pricing/) for integrating the paid
   version of Algolia.
   If you choose this option, and have obtained financial approval, then you can follow the
    open source steps.

2. [Install a local search plugin](#install-local-search-plugin) and don't use Algolia.
   Note the following caveats with local search:
   - Search indexing is part of the build.
     For large doc sites, there might be marginal performance deficits and additional size
     to the bundle.
     Usually, the doc site must be very large before it's even a consideration.
   - Search doesn't work when running in a development environment (`npm run start`).
     You must run `npm run build` and `npm run serve` to preview the local search.

### Install local search plugin

Follow these steps to configure the [`@easyops-cn/docusaurus-search-local`](https://github.com/easyops-cn/docusaurus-search-local)
local search plugin in your project:

1. In the root of your project, install the plugin:

    ```bash
    npm i @easyops-cn/docusaurus-search-local
    ```

2. Remove the entire `algolia` key under `config > themeConfig` in `docusaurus.config.js`.
   This is to ensure that the Algolia search bar is overridden by the plugin.

   ```js title="docusaurus.config.js"
   // DELETE the following code
   algolia: {
     // The application ID provided by Algolia
     appId: "NSRFPEJ4NC", # // cspell:disable-line
     // Public API key: it is safe to commit it
     apiKey: "cea41b975ad6c9a01408dfda6e0061d3",
     indexName: "docs-template", // Ping #documentation on Slack for your index name
     // Optional: see doc section below
     contextualSearch: true,
     // Optional: Specify domains where the navigation should occur through window.location 
     //instead on history.push. Useful when our Algolia config crawls multiple documentation
     // sites and we want to navigate with window.location.href to them.
     externalUrlRegex: "external\\.com|domain\\.com",
     // Optional: Algolia search parameters
     searchParameters: {},
     // Optional: path for search page that enabled by default (`false` to disable it)
     searchPagePath: "search",
     // ... other Algolia params
   },
   ```

3. Apply the configuration options for the local plugin under `config > themes` in `docusaurus.config.js`:

   ```js title="docusaurus.config.js"
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
  See [more plugin options](https://github.com/easyops-cn/docusaurus-search-local#theme-options) you
  can use.
  :::
