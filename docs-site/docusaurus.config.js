module.exports = {
  title: 'EcoSynTech Docs',
  tagline: 'ISO 27001, 5S, PDCA, SOP',
  url: 'https://github.com/ecosyntech68vn',
  baseUrl: '/docs/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'ecosyntech68vn',
  projectName: 'Ecosyntech-web',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ecosyntech68vn/Ecosyntech-web/edit/main/docs-site/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
}
