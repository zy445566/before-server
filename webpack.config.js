const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const webpack = require('webpack');

module.exports = {
  // devtool: 'source-map',
  mode: 'development', // production
  entry: './ui/src/app.js',
  output: {
    path: path.join(__dirname, 'server/static'),
    filename: 'webpack.bundle.js'
  },
  resolve: {
      alias: {
          '@': path.join(__dirname, 'ui/src'),
      }
  },
  plugins: [
    new HtmlWebpackPlugin({template: './ui/index.html'})
  ],
  module: {
    rules: [{
      test: /\.html$/,
      use: [ {
        loader: 'html-loader',
      }],
    },{
      test: /\.md$/,
      use: [ {
        loader: 'html-loader',
      }],
    }]
  }
};