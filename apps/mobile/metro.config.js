const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

// Expo's default config already handles the pnpm workspace (watch folders,
// symlinked packages, package exports). Only NativeWind is layered on top.
const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
