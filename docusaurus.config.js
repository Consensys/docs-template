const {themes} = require("prism-react-renderer");
const path = require("path");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

// Remote content from MetaMask docs
const { createRepo, buildRepoRawBaseUrl, listDocuments } = require("./src/lib/list-remote");
const metamaskRepo = createRepo("MetaMask", "metamask-docs", "main");
const servicesIndexPath = "services";
const baseJsonRpcPath = "services/reference/base/json-rpc-methods";
const partialsPath = "services/reference/_partials";

const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev ? "/" : "/";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Consensys docs guide",
  tagline:
    "A template documentation site repository and contribution guidelines.",
  url: "https://docs-template.consensys.io",
  baseUrl,
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      // Warn instead of throw for broken links - plugins will fix ported content links
      onBrokenMarkdownLinks: "warn",
    }
  },
  favicon: "img/favicon.ico",
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Consensys", // Usually your GitHub org/user name.
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
          editUrl: "https://github.com/Consensys/docs-template/tree/main/",
          routeBasePath: "/",
          path: "./docs",
          includeCurrentVersion: true,
          // Remark plugins for link rewriting, image path fixing, and component fixes
          // Using plugins from plugins/ directory (simpler, less brittle approach)
          // Only processes files in ported content directory
          // Run before default plugins to ensure links are fixed before validation
          beforeDefaultRemarkPlugins: [
            require("./plugins/remark-link-rewriter"),
            require("./plugins/remark-fix-image-paths"),
            require("./plugins/remark-fix-components"),
          ],
          // lastVersion: "23.x",
          // versions: {
          //   //defaults to the ./docs folder
          //   // using 'development' instead of 'next' as path
          //   current: {
          //     label: "development",
          //     path: "development",
          //   },
          //   //the last stable release in the versioned_docs/version-stable
          //   "23.x": {
          //     label: "stable (23.x)",
          //   },
          //   "22.x": {
          //     label: "22.x",
          //   },
          // },
          // @ts-ignore
          // eslint-disable-next-line global-require
          include: ["**/*.md", "**/*.mdx"],
          exclude: [
            "**/_*.{js,jsx,ts,tsx,md,mdx}",
            "**/_*/**",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__tests__/**",
          ],
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // algolia: {
      //   // The application ID provided by Algolia
      //   appId: "NSRFPEJ4NC",

      //   // Public API key: it is safe to commit it
      //   apiKey: "cea41b975ad6c9a01408dfda6e0061d3",

      //   indexName: "docs-template", // Ping #documentation on Slack for your index name

      //   // Optional: see doc section below
      //   contextualSearch: true,

      //   // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
      //   externalUrlRegex: "external\\.com|domain\\.com",

      //   // Optional: Algolia search parameters
      //   searchParameters: {},

      //   // Optional: path for search page that enabled by default (`false` to disable it)
      //   searchPagePath: "search",

      //   // ... other Algolia params
      // },
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
        },
      },
      navbar: {
        title: "Consensys docs guide",
        logo: {
          alt: "Consensys logo",
          src: "img/logo.svg",
          srcDark: "img/logo_dark.svg",
          width: 32,
          height: 32,
        },
        items: [
          {
            href: "https://github.com/Consensys/docs-template",
            className: "header-github-link",
            position: "right",
          },
          {
            href: "https://discord.com/invite/consensys",
            className: "header-discord-link",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Consensys developer docs",
            items: [
              {
                label: "Overview",
                to: "/",
              },
              {
                label: "Contribute to the docs",
                to: "/contribute",
              },
              {
                label: "Create a new doc site",
                to: "/create",
              },
              {
                label: "Configure advanced features",
                to: "/configure",
              },
            ],
          },
          {
            title: "Consensys doc sites",
            items: [
              {
                label: "Teku",
                href: "https://docs.teku.consensys.net/",
              },
              {
                label: "MetaMask",
                href: "https://docs.metamask.io/",
              },
              {
                label: "Infura",
                href: "https://docs.infura.io/",
              },
              {
                label: "See full list",
                to: "/#list-of-documentation-sites",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Consensys documentation GitHub",
                href: "https://github.com/Consensys/docs-template",
              },
              {
                label: "Consensys Discord",
                href: "https://discord.com/invite/consensys",
              },
              {
                label: "Consensys Twitter",
                href: "https://twitter.com/consensys",
              },
              {
                label: "Consensys home",
                href: "https://consensys.net/",
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Consensys, Inc.`,
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
    // Remote content: MetaMask Services Index
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-services-index",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, servicesIndexPath),
        outDir: "docs/single-source/between-repos/Plugins/MetaMask-ported-data",
        documents: ["index.md"], // Downloads services/index.md
        // To sync content from MetaMask docs, run: npx docusaurus download-remote-metamask-services-index
        // Set to false for auto-download on start/build (adds ~2.5 min to build time)
        noRuntimeDownloads: true,
        performCleanup: false, // Keep files after build
      },
    ],
    // Remote content: MetaMask _partials (required for Base JSON-RPC methods)
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-partials",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, partialsPath),
        outDir: "docs/single-source/between-repos/Plugins/MetaMask-ported-data/reference/_partials",
        documents: listDocuments(metamaskRepo, ["**/*.md", "**/*.mdx"], ["**/_*.{js,jsx,ts,tsx}"], partialsPath),
        // To sync content from MetaMask docs, run: npx docusaurus download-remote-metamask-partials
        // Set to false for auto-download on start/build (adds ~2.5 min to build time)
        noRuntimeDownloads: true,
        performCleanup: false, // Keep files after build
      },
    ],
    // Remote content: MetaMask Base JSON-RPC Methods
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-base-json-rpc",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, baseJsonRpcPath),
        outDir: "docs/single-source/between-repos/Plugins/MetaMask-ported-data/reference/base/json-rpc-methods",
        documents: listDocuments(metamaskRepo, ["**/*.md", "**/*.mdx"], ["**/_*.{js,jsx,ts,tsx}"], baseJsonRpcPath),
        // To sync content from MetaMask docs, run: npx docusaurus download-remote-metamask-base-json-rpc
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Images (ported from upstream)
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-images",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, servicesIndexPath),
        outDir: "static/img/ported-images",
        documents: listDocuments(metamaskRepo, ["**/images/**/*.{png,jpg,jpeg,gif,svg,webp}"], [], servicesIndexPath),
        // To sync images from MetaMask docs, run: npx docusaurus download-remote-metamask-images
        // Set to false for auto-download on start/build (adds time to build)
        noRuntimeDownloads: true,
        performCleanup: false, // Keep files after build
      },
    ],
    // This is how redirects are done
    // [
    //   "@docusaurus/plugin-client-redirects",
    //   {
    //     redirects: [
    //       {
    //         from: "/HowTo/Get-Started/Installation-Options/Install-Binaries",
    //         to: "/get-started/install/install-binaries",
    //       },
    //     ],
    //     // its quite odd here in that its back to front - replace(to, from)
    //     createRedirects(existingPath) {
    //       if (existingPath.includes("/development")) {
    //         return [
    //           existingPath.replace("/development", "/en/latest"),
    //           existingPath.replace("/development", "/latest"),
    //         ];
    //       }
    //       if (existingPath.includes("/")) {
    //         return [existingPath.replace("/", "/stable")];
    //       }
    //       return undefined; // Return a falsy value: no redirect created
    //     },
    //   },
    // ],
    // Webpack alias plugin to resolve /services/ import paths
    function (context, options) {
      return {
        name: "webpack-alias-plugin",
        configureWebpack(config, isServer) {
          return {
            resolve: {
              alias: {
                "/services": path.resolve(__dirname, "docs", "single-source", "between-repos", "Plugins", "MetaMask-ported-data"),
              },
            },
          };
        },
      };
    },
  ],
  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        docsRouteBasePath: "/",
        hashed: true,
        indexBlog: false,
      },
    ],
  ],
};

module.exports = config;
