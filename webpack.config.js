const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {getStaticPath} = require('./util/index')
// const webpack = require('webpack');

module.exports = {
  // devtool: 'source-map',
  mode: 'development', // production
  entry: './ui/src/app.js',
  output: {
    path: getStaticPath(),
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