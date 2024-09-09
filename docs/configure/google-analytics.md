---
description: Configure Google Analytics to track metrics for your docs.
sidebar_label: Google Analytics
sidebar_position: 3
---

# Configure Google Analytics

Docusaurus supports [Google Tag Manager](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-tag-manager)
and [GTag](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-gtag)
plugins for Google Analytics.
The plugins are installed by default in this template repository.

## Set up Google Tag Manager and GTag

Join the [**#documentation**](https://consensys.slack.com/archives/C0272B5P1CY) channel on Consensys
Slack and request your Google Analytics tags.
Provide information about your project in your request.

After receiving your tags, fill those values in `docusaurus.config.js` in the highlighted lines as follows:

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
