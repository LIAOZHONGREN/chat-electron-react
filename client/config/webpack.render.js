const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const baseConfig = require('./webpack.config');

const resolve = dir => path.join(__dirname, dir);

const sassRegex = /\.scss$/;
const sassModuleRegex = /\.(mod|module).scss$/;
// antd@4 下报错
// const lessNormalRegex = new RegExp(`(\\.normal\\.less$)|(ode_modules\\${path.sep}antd)`);
const getStyleLoaders = (mod = false) => [
  'style-loader',
  {
    loader: 'css-loader',
    options: {
      modules: mod ? { localIdentName: '[path][name]__[local]' } : undefined,
    }
  },
  {
    loader: 'sass-loader',
    options: {
      sassOptions: { javascriptEnabled: true },
    },
  },
];

module.exports = function (env) {
  const isDev = env === 'development';

  return merge(baseConfig(env), {
    target: 'electron-renderer',
    entry: {
      main: resolve('../src/render/main.tsx'),
      createGroupChatModal: resolve('../src/render/modal/createGroupChatModal/createGroupChatModal.tsx'),
      setHeadImgModal: resolve('../src/render/modal/setHeadImgModal/setHeadImgModal.tsx'),
      loginAndRegister: resolve('../src/render/pages/loginAndRegister/LoginAndRegister.tsx'),
      identitySearchModal: resolve('../src/render/modal/identitySearchModal/identitySearchModal.tsx'),
      musicModal: resolve('../src/render/modal/musicModal/musicModal.tsx'),
      videoModal: resolve('../src/render/modal/videoModal/videoModal.tsx'),
      relayMsgModal: resolve('../src/render/modal/relayMsgModal/relayMsgModal.tsx'),
      callerIDModal: resolve('../src/render/modal/callerIDModal/callerIDModal.tsx'),
      videoCallModal: resolve('../src/render/modal/videoCallModal/videoCallModal.tsx'),
      voiceCallModal: resolve('../src/render/modal/voiceCallModal/voiceCallModal.tsx'),
      screenshotModal: resolve('../src/render/modal/screenshotModal/screenshotModal.tsx'),
    },
    output: {
      path: resolve('../src/dist'),
      filename: isDev ? '[name].js' : '[name].[hash:9].js',
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            // presets 是 plugins 的集合,把很多需要转换的ES6的语法插件集合在一起，避免各种配置
            // presets 加载顺序和一般理解不一样 ，是倒序的
            presets: [
              ["@babel/preset-env", {
                // targets 用来指定 是转换 需要支持哪些浏览器的的支持,这个语法是参照 browserslist,
                // 如果设置 browserslist 可以不设置 target
                "targets": "> 0.25%, not dead",
                // 这个是非常重要的一个属性，主要是用来配合@babel/polyfill ，
                // 这里简单讲下，在 transform-runtime 和 polyfill 差别的环节重点讲, 
                // 有 false,entry,usage,默认是 false 啥子也不干，
                // 为 entry，项目中 main.js 主动引入 @babel/polyfill , 会把所有的 polyfill 都引入，
                // 为 usage main.js 主动引入 @babel/polyfill, 只会把用到的 polyfill 引入，
                "useBuiltIns": "usage",
                "corejs": 3,
                // 默认是 false 开启后控制台会看到 哪些语法做了转换，Babel的日志信息，开发的时候强烈建议开启
                // "debug": isDev,
              }
              ],
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            // plugins 加载顺序是正序的
            plugins: [
              // "@babel/plugin-syntax-dynamic-import",       // preset-env 中已经集成
              // "@babel/plugin-proposal-object-rest-spread", // preset-env 中已经集成
              "@babel/plugin-transform-runtime",
              ["@babel/plugin-proposal-class-properties", { "loose": true }],
              ["import", {
                "libraryName": "antd",
                "libraryDirectory": "es",
                "style": "css", // or 'true'
              }],
            ],
            cacheDirectory: true,
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: sassRegex,
          exclude: sassModuleRegex,
          use: getStyleLoaders(),
        },
        {
          test: sassModuleRegex,
          use: getStyleLoaders(true),
        },
        {
          test: /\.(jpe?g|png|svg|gif|mp3|exe|dll)$/,
          loader: 'file-loader',
        },
      ],
    },
    resolve: {
      alias: {
        '@render': resolve('../src/render'),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'screenshotModal.html',
        template: resolve('../src/render/modal/screenshotModal/screenshotModal.html'),
        chunks: ['screenshotModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'voiceCallModal.html',
        template: resolve('../src/render/modal/voiceCallModal/voiceCallModal.html'),
        chunks: ['voiceCallModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'videoCallModal.html',
        template: resolve('../src/render/modal/videoCallModal/videoCallModal.html'),
        chunks: ['videoCallModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'callerIDModal.html',
        template: resolve('../src/render/modal/callerIDModal/callerIDModal.html'),
        chunks: ['callerIDModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'relayMsgModal.html',
        template: resolve('../src/render/modal/relayMsgModal/relayMsgModal.html'),
        chunks: ['relayMsgModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'videoModal.html',
        template: resolve('../src/render/modal/videoModal/videoModal.html'),
        chunks: ['videoModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'musicModal.html',
        template: resolve('../src/render/modal/musicModal/musicModal.html'),
        chunks: ['musicModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'identitySearchModal.html',
        template: resolve('../src/render/modal/identitySearchModal/identitySearchModal.html'),
        chunks: ['identitySearchModal']
      })
      ,
      new HtmlWebpackPlugin({
        filename: 'createGroupChatModal.html',
        template: resolve('../src/render/modal/createGroupChatModal/createGroupChatModal.html'),
        chunks: ['createGroupChatModal']
      }),
      new HtmlWebpackPlugin({
        filename: 'setHeadImgModal.html',
        template: resolve('../src/render/modal/setHeadImgModal/setHeadImgModal.html'),
        chunks: ['setHeadImgModal']
      }),
      new HtmlWebpackPlugin({
        filename: 'loginAndRegister.html',
        template: resolve('../src/render/pages/loginAndRegister/loginAndRegister.html'),
        chunks: ['loginAndRegister']
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: resolve('../src/render/index.html'),
        chunks: ['main']
      }),
      new CopyWebpackPlugin([
        // { from: resolve('../src/render/index.html'), to: resolve('../src/dist'), },
        { from: resolve('../src/render/static'), to: resolve('../src/dist/static'), },
      ]),
      ...(isDev
        ? [
          // This is necessary to emit hot updates (currently CSS only):
          new webpack.HotModuleReplacementPlugin(),
        ]
        : [
          new CleanWebpackPlugin(),
        ]),
    ],
    devServer: {
      // port: 4100, 放在 .env 中设置
      // 请注意，当前只有对CSS的更改是热重加载的。JS更改将刷新浏览器。
      hot: true,
      contentBase: resolve('../src/dist'), // 静态文件服务器地址
      stats: 'minimal', // 'none' | 'errors-only' | 'minimal' | 'normal' | 'verbose' object
      // stats: { // log 信息控制
      //   assets: false, // 能关闭静态文件搬运的 log
      //   children: false, // 能关闭 mini-css-extract-plugin log
      // },
      historyApiFallback: {
        rewrites: [
          { from: /createGroupChatModal/, to: '/createGroupChatModal.html' },//当访问http://localhost:port/modal.html时转为访问modal.html文件
          { from: /setHeadImgModal/, to: '/setHeadImgModal.html' },
          { from: /loginAndRegister/, to: '/loginAndRegister.html' },
          { from: /identitySearchModal/, to: '/identitySearchModal.html' },
          { from: /musicModal/, to: '/musicModal.html' },
          { from: /videoModal/, to: '/videoModal.html' },
          { from: /relayMsgModal/, to: '/relayMsgModal.html' },
          { from: /callerIDModal/, to: '/callerIDModal.html' },
          { from: /videoCallModal/, to: '/videoCallModal.html' },
          { from: /voiceCallModal/, to: '/voiceCallModal.html' },
          { from: /screenshotModal/, to: '/screenshotModal.html' },
        ]
      }
    },
  });
};
