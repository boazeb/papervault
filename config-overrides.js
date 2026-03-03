/* config-overrides.js */
const webpack = require('webpack');
module.exports = function override(config, env) {
    //do stuff with the webpack config...

    // Webpack 5 ESM resolution doesn't add .js; packages like @react-pdf/renderer
    // request 'react/jsx-runtime' and fail. Alias to in-src shims that re-export (avoids ModuleScopePlugin).
    const path = require('path');
    const paths = require('react-scripts/config/paths');
    config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react/jsx-runtime': path.join(paths.appSrc, 'react-jsx-runtime.js'),
        'react/jsx-dev-runtime': path.join(paths.appSrc, 'react-jsx-dev-runtime.js'),
    };

    config.resolve.fallback = {
        url: require.resolve('url'),
        assert: require.resolve('assert'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        vm: require.resolve('vm-browserify'),
        'process/browser': require.resolve('process/browser'),
    };
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    );

    //bb: fix to resolve issue with pdfjs not working... something to do with webpack and poyfills.
    config.module.rules.push({
        test: /\.(js|mjs|jsx)$/,
        enforce: 'pre',
        loader: require.resolve('source-map-loader'),
        exclude: /node_modules/,
        resolve: {
            fullySpecified: false,
        },
    });

    return config;
};
