/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  workspaceRoot: '../../',
  mount: {
  },
  plugins: [
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    jsxFactory: 'renderer.create',
    jsxFragment: 'renderer.fragment',
  },
}

