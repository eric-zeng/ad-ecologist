const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: {
    index: path.join(__dirname, 'src/web/ts/index.tsx')
  },
  output: {
    filename: 'js/[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  target: 'web',
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/web/html/*.html', to: 'html/[name][ext]' },
        { from: 'src/web/img/', to: 'img/[name][ext]' },
        { from: 'src/web/css/*.css', to: 'css/[name][ext]' },
      ]
    })
  ],
};