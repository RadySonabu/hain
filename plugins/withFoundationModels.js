const { withPodfile, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Patch 1 — Podfile
 * Explicitly adds the local ExpoFoundationModels pod, bypassing Expo autolinking
 * which silently skips file: symlinks.
 */
function withFoundationModelsPodfile(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes("ExpoFoundationModels")) {
      return config;
    }

    config.modResults.contents = contents.replace(
      /(\s+# Pods for foodai)/,
      `\n  pod 'ExpoFoundationModels', :path => '../modules/foundation-models'\n$1`
    );

    return config;
  });
}

/**
 * Patch 2 — ExpoModulesProvider.swift
 * Registers FoundationModelsModule in Expo's module registry so
 * requireNativeModule("FoundationModels") resolves at runtime.
 */
function withFoundationModelsProvider(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const providerPath = path.join(
        config.modRequest.platformProjectRoot,
        "foodai",
        "ExpoModulesProvider.swift"
      );

      if (!fs.existsSync(providerPath)) {
        return config;
      }

      let contents = fs.readFileSync(providerPath, "utf8");

      if (contents.includes("FoundationModelsModule")) {
        return config;
      }

      // Insert our module as the first entry in the return array
      contents = contents.replace(
        /return \[/,
        "return [\n      FoundationModelsModule.self,"
      );

      fs.writeFileSync(providerPath, contents);

      return config;
    },
  ]);
}

module.exports = function withFoundationModels(config) {
  config = withFoundationModelsPodfile(config);
  config = withFoundationModelsProvider(config);
  return config;
};