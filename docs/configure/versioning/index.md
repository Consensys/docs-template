---
description: Support and manage multiple documentation versions.
sidebar_position: 1
---

# Configure versioning

Docusaurus can manage multiple versions of your documentation.
See the [Docusaurus versioning documentation](https://docusaurus.io/docs/next/versioning) for
detailed context and instructions on managing versions.

## Create a docs version

Release version 1.0 of your docs using the following command:

```bash
npm run docusaurus docs:version 1.0
```

The `docs` folder is copied into `versioned_docs/version-1.0` and `versions.json` is created.

Your docs now have two versions:

- `1.0` at `http://localhost:3000/docs/` for the version 1.0 docs
- `current` at `http://localhost:3000/docs/next/` for the upcoming, unreleased docs.

## Add a version dropdown

To navigate seamlessly across versions, add a version dropdown by modifying `docusaurus.config.js`
as follows:

```js title="docusaurus.config.js"
module.exports = {
  themeConfig: {
    navbar: {
      items: [
        // highlight-start
        {
          type: "docsVersionDropdown",
        },
        // highlight-end
      ],
    },
  },
};
```

The docs version dropdown appears in your navbar:

<p align="center">

![Docs Version Dropdown](../img/docsVersionDropdown.png)

</p>

## Update an existing version

You can edit versioned docs in their respective folder:

- `versioned_docs/version-1.0/hello.md` updates `http://localhost:3000/docs/hello`.
- `docs/hello.md` updates `http://localhost:3000/docs/next/hello`.
