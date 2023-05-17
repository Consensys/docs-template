---
description: Track metrics for your documentation site by configuring Google Analytics.
sidebar_label: Google Analytics
sidebar_position: 3
---

# Configure Google Analytics

[Google Tag Manager](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-tag-manager) and [GTag](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-gtag) are Docusaurus plugins available for Google Analytics.

:::info

The **Google Tag Manager** and **GTAag** plugin is _pre-installed_ by default with this template repo.

:::

:::tip

Please join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY) Slack channel and request for your tags. Make sure to provide some information about your project in your request.

:::

## Setting up GTag and GTM in `docusaurus.config.js`

Fill in with the provided values in the highlighted lines shown below in the `docusaurus.config.js`.

```js title="docusaurus.config.js" {6,13}
const config = {
  plugins: [
    [
      "@docusaurus/plugin-google-gtag",
      {
        trackingID: "G-",
        anonymizeIP: true,
      },
    ],
    [
      "@docusaurus/plugin-google-tag-manager",
      {
        containerId: "GTM-",
      },
    ],
  ],
};
```
