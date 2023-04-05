const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    hot: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['dynamic-import-webpack']
          },
        },
      },
      {
        test: /\.(png)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[hash][ext][query]'
        }
      }
    ],
  },
};
