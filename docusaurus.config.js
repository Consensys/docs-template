const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev ? "/" : "/";

/**
 * @type {import('redocusaurus').PresetEntry}
 */
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
      primaryColorDark: "#a2aeec",
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

// const docusaurusApi2 = [
//   "docusaurus-plugin-openapi-docs",
//   {
//     id: "openapi",
//     docsPluginId: "classic", // e.g. "classic" or the plugin-content-docs id
//     config: {
//       api: {
//         specPath:
//           "https://raw.githubusercontent.com/PaloAltoNetworks/docusaurus-openapi-docs/main/demo/examples/petstore.yaml", // path or URL to the OpenAPI spec
//         outputDir: "docs/test-api", // output directory for generated *.mdx and sidebar.js files
//         template: "api.mustache", // Customize API MDX with mustache template
//         sidebarOptions: {
//           groupPathsBy: "tag",
//           categoryLinkSource: "tag",
//         },
//       },
//     },
//   },
// ];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "ConsenSys Docs",
  tagline:
    "A template repository to quickly boostrap a Docusaurus application to serve documentation",
  url: "https://docs-template.consensys.net",
  baseUrl,
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  favicon: "img/favicon.ico",
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "ConsenSys", // Usually your GitHub org/user name.
  projectName: "docs-template", // Usually your repo name.
  deploymentBranch: "gh-pages", // Github Pages deploying branch

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Set a base path separate from default /docs
          editUrl: "https://github.com/ConsenSys/docs-template/tree/main/",
          routeBasePath: "/",
          path: "docs",
          // @ts-ignore
          // eslint-disable-next-line global-require
          remarkPlugins: [require("remark-docusaurus-tabs")],
          // docLayoutComponent: "@theme/DocPage", // Remove if not using docusaurus-plugin-openapi-docs
          // docItemComponent: "@theme/ApiItem", // Remove if not using docusaurus-plugin-openapi-docs
          include: ["**/*.md", "**/*.mdx"],
          exclude: [
            "**/_*.{js,jsx,ts,tsx,md,mdx}",
            "**/_*/**",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__tests__/**",
          ],
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          includeCurrentVersion: true,
        },
        blog: {
          // routeBasePath: '/',
          path: "blog",
          editUrl: "https://github.com/ConsenSys/docs-template/tree/main/",

          postsPerPage: 5,
          feedOptions: {
            type: "all",
            copyright: `Copyright © ${new Date().getFullYear()} ConsenSys Software, Inc.`,
          },
          blogSidebarCount: "ALL",
          blogSidebarTitle: "All our posts",
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
    redocusaurus, // remove if not using redocusaurus
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        // The application ID provided by Algolia
        appId: "NSRFPEJ4NC",

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
      announcementBar: {
        id: "announcement_bar",
        content:
          "🚧 This is a template documentation site to boostrap your Docusaurus boostrap application",
        backgroundColor: "#fafbfc",
        textColor: "#091E42",
        isCloseable: false,
      },
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      navbar: {
        title: "ConsenSys Docs",
        logo: {
          alt: "ConsenSys Docs",
          src: "img/logo.svg",
          srcDark: "img/logo_dark.svg",
          width: 32,
          height: 32,
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "docSidebar",
            docId: "index",
            position: "left",
            label: "Documentation",
          },
          { to: "blog", label: "Blog", position: "left" },
          {
            label: "API",
            to: "/api/",
          },
          // {
          //   type: "docSidebar",
          //   sidebarId: "apiSidebar",
          //   docId: "index",
          //   position: "left",
          //   label: "API2",
          // },
          {
            href: "https://github.com/ConsenSys/docs-template",
            className: "header-github-link",
            position: "right",
          },
          {
            href: "https://discord.com/invite/consensys",
            className: "header-discord-link",
            position: "right",
          },
          {
            href: "https://twitter.com/consensys",
            className: "header-twitter-link",
            position: "right",
          },
          {
            href: "https://hub.docker.com/r/consensys",
            className: "header-dockerhub-link",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Learn",
            items: [
              {
                label: "Getting Started",
                to: "/category/getting-started",
              },
              {
                label: "Style Guide",
                to: "/getting-started/style-guide",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Discord",
                href: "https://discord.com/invite/consensys",
              },
              {
                label: "Issues",
                href: "https://github.com/ConsenSys/docs-template/issues",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/ConsenSys/protocols-docs-test",
              },
              {
                label: "ConsenSys",
                href: "https://consensys.net",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ConsenSys, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      languageTabs: [
        {
          highlight: "bash",
          language: "curl",
          logoClass: "bash",
        },
        {
          highlight: "python",
          language: "python",
          logoClass: "python",
        },
        {
          highlight: "go",
          language: "go",
          logoClass: "go",
        },
        {
          highlight: "javascript",
          language: "nodejs",
          logoClass: "nodejs",
        },
        // {
        //  highlight: "ruby",
        //  language: "ruby",
        //  logoClass: "ruby",
        // },
        // {
        //   highlight: "csharp",
        //   language: "csharp",
        //   logoClass: "csharp",
        // },
        // {
        //   highlight: "php",
        //   language: "php",
        //   logoClass: "php",
        // },
      ],
    }),
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
  ], // remove if not using docusaurus-plugin-openapi-docs
  themes: [], // remove if not using docusaurus-plugin-openapi-docs
};

module.exports = config;
