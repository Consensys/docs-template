// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docSidebar: [
    "index",
    {
      type: "category",
      label: "Contribute to the docs",
      link: {
        type: "generated-index",
        slug: "/contribute",
      },
      items: [
        {
          type: "autogenerated",
          dirName: "contribute",
        },
      ],
    },
    {
      type: "category",
      label: "Create a new doc site",
      link: {
        type: "generated-index",
        slug: "/create",
      },
      items: [
        {
          type: "autogenerated",
          dirName: "create",
        },
      ],
    },
    {
      type: "category",
      label: "Configure advanced features",
      link: {
        type: "generated-index",
        slug: "/configure",
      },
      items: [
        {
          type: "autogenerated",
          dirName: "configure",
        },
      ],
    },
  ],
  // apiSidebar: [
  //   {
  //     type: "category",
  //     label: "Pet Store",
  //     link: {
  //       type: "generated-index",
  //       title: "Test API",
  //       slug: "/category/test-api",
  //     },
  //     // @ts-ignore
  //     // eslint-disable-next-line global-require
  //     items: require("./docs/test-api/sidebar.js"),
  //     // items: [
  //     //   {
  //     //     type: "autogenerated",
  //     //     dirName: "test-api", // '.' means the current docs folder
  //     //   },
  //     // ],
  //   },
  // ],
  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

module.exports = sidebars;
