const path = require('path');

// Q: Why do you use webpack?
// A: https://github.com/nativefier/nativefier/commit/cde5c1e13bdc2739604cab04bac64eae0d719ed1
//
// main.js: bundle app sources for packaged runtime.
// preload.js: single-file bundle required when sandbox: true (sandbox preload cannot
// require sibling modules compiled by tsc under lib/preload/).

const sharedConfig = {
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  node: {
    __dirname: false,
  },
  externals: {
    electron: 'commonjs electron',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  mode: 'none',
};

module.exports = [
  {
    ...sharedConfig,
    target: 'node',
    entry: './src/main.ts',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'lib'),
    },
  },
  {
    ...sharedConfig,
    target: 'electron-preload',
    entry: './src/preload.ts',
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'lib'),
    },
  },
];
