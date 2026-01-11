const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// モバイルビルドではwebsiteディレクトリを除外して軽量化
const isWeb = process.env.EXPO_OS === "web" || process.argv.includes("--platform=web");
if (!isWeb) {
  config.resolver.blockList = [
    ...(config.resolver.blockList || []),
    new RegExp(path.join(__dirname, "app", "website").replace(/\\/g, "\\\\") + ".*"),
  ];
}

module.exports = withNativeWind(config, {
  input: "./global.css",
});
