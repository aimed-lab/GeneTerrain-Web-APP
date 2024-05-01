const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    entry: "./src/app.ts",
    mode: "development",
    // output: {
    //     filename: "main.js",
    //     path: path.resolve(__dirname, "dist"),
    // },
    devServer: {
        static: './dist',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }
      },
    optimization: {
        runtimeChunk: 'single',
      },
    resolve: {
        extensions: ['.tsx', '.js', '.ts'],
        alias: {
            fs: '/node_modules/fs/package.json'
        }
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|jpeg)$/i,
                type: "asset/resource",
            },
            {
                // Embed your WGSL files as strings
                test: /\.wgsl$/i,
                type: "asset/source",
            },
            {
                test: /\.css$/,
                use: [
                  'style-loader',
                  'css-loader'
                ]
              },
              {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                //exclude: /node_modules/,
              }
        ]
    },
    plugins: [new HtmlWebpackPlugin({
        template: "./index.html",
    })],
};
