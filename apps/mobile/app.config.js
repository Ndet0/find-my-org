const palette = require('@opsflow/ui/palette.json')
const { expo } = require('./app.json')

/**
 * Expo reads app.json first and hands it here, so everything static stays
 * in JSON and only the two colours the launcher and splash screen paint
 * come from the shared palette. Change palette.json, re-run
 * `pnpm --filter @opsflow/mobile assets`, and the icon set follows.
 */
module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      adaptiveIcon: { ...expo.android.adaptiveIcon, backgroundColor: palette.neutral[900] },
    },
    plugins: expo.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
        ? [plugin[0], { ...plugin[1], backgroundColor: palette.neutral[100] }]
        : plugin,
    ),
  },
}
