// metro.config.js — Performance-optimised for OneDrive / Windows
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// ─── 1. Disk cache so nothing is re-compiled between restarts ────────────────
const cacheRoot = path.join(__dirname, '.metro-cache');
config.cacheStores = [new FileStore({ root: path.join(cacheRoot, 'cache') })];

// ─── 2. Exclude huge folders Metro should never need to watch ─────────────────
//    Biggest win on Windows / OneDrive — stops the file-watcher thrashing
config.resolver.blockList = [
  /.*\/android\/.*/,
  /.*\/ios\/.*/,
  /.*\/windows\/.*/,
  /.*\/macos\/.*/,
  /.*\/__tests__\/.*/,
  /.*\.test\.[tj]sx?$/,
  /.*\.spec\.[tj]sx?$/,
  /.*\/dist\/.*/,
  /.*\/build\/.*/,
  /.*\/\.git\/.*/,
];

// ─── 3. More workers = faster bundling on multi-core CPUs ────────────────────
config.maxWorkers = 4;

// ─── 4. Only watch the project source directory ──────────────────────────────
config.watchFolders = [__dirname];

module.exports = withNativeWind(config, { input: './global.css' });
