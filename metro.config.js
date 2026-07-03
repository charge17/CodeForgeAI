const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix pnpm symlink resolution — expo-modules-core and similar packages
// need explicit nodeModulesPaths so Metro can resolve through pnpm's virtual store
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Disable package exports resolution which conflicts with pnpm's symlink structure
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
