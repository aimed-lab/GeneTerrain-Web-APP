const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  entry: {
    index: "./src/Authentication/login.tsx",
    main: "./src/app.ts",
  },
  mode: "development",
  output: {
    filename: "[name].bundle.js", // [name] will create base.bundle.js and login.bundle.js
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    static: "./dist",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
    client: { overlay: false },
  },
  optimization: {
    runtimeChunk: "single",
  },
  resolve: {
    extensions: [".tsx", ".js", ".ts", ".css"],
    alias: {
      fs: "/node_modules/fs/package.json",
    },
    fallback: {
      zlib: require.resolve("browserify-zlib"),
      crypto: require.resolve("crypto-browserify"),
      http: require.resolve("stream-http"),
      url: require.resolve("url/"),
      querystring: require.resolve("querystring-es3"),
      net: false,
      async_hooks: false,
      vm: require.resolve("vm-browserify"),
    },
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
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        exclude: ["/node_modules/"],
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        //exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
      filename: "./index.html", // Output to dist/login.html
      chunks: ["index"], // Load login.bundle.js
    }),
    // For index.html (this will load app.ts)
    new HtmlWebpackPlugin({
      template: "./home.html",
      filename: "home.html", // Output to dist/index.html
      chunks: ["main"], // Load main.bundle.js
    }),
    new HtmlWebpackPlugin({
      template: "./card-details.html",
      filename: "card-details.html", // Output to dist/index.html
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /express\/lib\/view/,
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
  externals: {
    express: "commonjs express", // Exclude express from the client-side bundle
  },
  devtool: "source-map",
};
