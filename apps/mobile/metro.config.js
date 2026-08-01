// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: workspace kökündeki node_modules da izlenmeli, aksi halde
// @yolla/core değişiklikleri Metro tarafından görülmez.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Hoisted linker kullanıyoruz; yine de hiyerarşik aramayı kapatmak
// yanlış sürüm çözümlemesini önler.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
