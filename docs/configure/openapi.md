---
description: Configure OpenAPI docs using Redocusaurus.
sidebar_position: 4
sidebar_label: OpenAPI docs
---

# Configure OpenAPI docs

This template repository uses the [Redocusaurus](https://redocusaurus.vercel.app/) plugin to include
OpenAPI documentation directly into the doc site.
With this plugin, you can manage OpenAPI docs within Docusaurus without linking to a separate site
and incurring more fragmentation in your doc system.

See the [demo OpenAPI docs using Redocusaurus](/api).

## Configure Redocusaurus

The following is an example of how to configure the Redocusaurus plugin in `docusaurus.config.js`:

```js title="docusaurus.config.js"
const redocusaurus = [
  "redocusaurus",
  {
    specs: [
      {
        id: "using-remote-url",
        // Remote File
        spec: "https://raw.githubusercontent.com/rohit-gohri/redocusaurus/main/website/openapi/single-file/openapi.yaml",
        route: "/api/",
      },
    ],
    theme: {
      /**
       * Highlight color for docs
       */
      primaryColor: "#3655d5",
      /**
       * Options to pass to redoc
       * @see https://github.com/redocly/redoc#redoc-options-object
       */
      options: { disableSearch: true },
      /**
       * Options to pass to override RedocThemeObject
       * @see https://github.com/Redocly/redoc#redoc-theme-object
       */
      theme: {},
    },
  },
];
```

## Remove Redocusaurus

To remove the Redocusaurus plugin:

1. In your project repository, run `npm uninstall redocusaurus`.

2. Remove the [Redocusaurus configuration](#configure-redocusaurus) from `docusaurus.config.js`.

3. Under the `const config` object in `docusaurus.config.js`, remove the references to Redocusaurus
   from the `plugins` and `themes` key.
