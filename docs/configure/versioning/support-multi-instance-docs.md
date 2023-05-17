---
description: Support versioned and non-versioned documentation in multiple instances.
sidebar_position: 2
---

# Support versioned and non-versioned docs

You may have a use-case where some part of your documentation is non-versioned and another part is versioned. Docusaurus supports multi-instance docs since the docs functionality is a plugin itself and can be re-used multiple times.

```js title="docusaurus.config.js" {6-11,18-24}
module.exports = {
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          // id: 'product', // omitted => default instance
          path: "product",
          routeBasePath: "product",
          sidebarPath: require.resolve("./sidebarsProduct.js"),
          // ... other options
        },
      },
    ],
  ],
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "community",
        path: "community",
        routeBasePath: "community",
        sidebarPath: require.resolve("./sidebarsCommunity.js"),
        // ... other options
      },
    ],
  ],
};
```

Up-to-date documentation on how to set this up can be found on Docusaurus' [documentation](https://docusaurus.io/docs/docs-multi-instance#use-cases).
