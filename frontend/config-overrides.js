const webpack = require('webpack');

module.exports = function override(config) {
  // Добавляем полифилл для Buffer
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ]);

  // Добавляем резолв для браузерных полифиллов
  config.resolve.fallback = {
    ...config.resolve.fallback,
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
  };

  return config;
};