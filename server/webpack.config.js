const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const NodemonPlugin = require('nodemon-webpack-plugin')


let pathsToClean = ['dist'];

let cleanOptions = {
    root: path.resolve(__dirname),
    verbose: true,
    dry: false,
};

module.exports = {
    target: 'node',
    entry: path.resolve(__dirname, './src/main.ts'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        libraryTarget: 'commonjs',
    },
    module: {
        rules: [{
            test: /.ts?$/,
            use: "ts-loader",
            exclude: /node_modules/
        }]
    },
    resolve: {
        extensions: ['.js', '.json', '.ts',],
    },
    plugins: [new CleanWebpackPlugin(), new NodemonPlugin({ script: './src/main.ts', watch: path.resolve('./src'), ext: 'ts', env: { NODE_ENV: 'development' }, })],
};