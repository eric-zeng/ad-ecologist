const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  entry: {
    approveAds: './src/extensionPages/ts/approveAds.tsx',
    background: './src/background/background.ts',
    complete: './src/extensionPages/ts/complete.tsx',
    contentScript: './src/contentScript/contentScript.ts',
    register: './src/extensionPages/ts/register.tsx',
    relevanceSurvey: './src/extensionPages/ts/relevanceSurvey.tsx',
    status: './src/extensionPages/ts/status.tsx'
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['css-loader'],
      }
    ],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/*.json', to: '[name].json' },
        { from: 'src/extensionPages/img/', to: 'img/[name][ext]' },
        { from: 'src/extensionPages/img/', to: 'img/[name].[ext]' },
        { from: 'src/extensionPages/html/*.html', to: '[name].html' },
        { from: 'src/extensionPages/css/*.css', to: 'css/[name].css' },
        { from: 'src/extensionPages/lib/', to: 'lib/[name][ext]' }
      ]
    })
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  }
};