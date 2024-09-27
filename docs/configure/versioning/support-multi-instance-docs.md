---
description: Support versioned and unversioned documentation in multiple instances.
sidebar_position: 2
---

# Support versioned and unversioned docs

You might need part of your documentation to be versioned and another part unversioned.
Docusaurus supports multi-instance docs since the docs functionality is a plugin itself and can be
re-used multiple times.

For example, configure multiple doc instances with their own versioning systems by modifying
`docusaurus.config.js`:

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

See the [Docusaurus multi-instance documentation](https://docusaurus.io/docs/docs-multi-instance#use-cases)
for detailed instructions on setting up versioned and unversioned docs.
