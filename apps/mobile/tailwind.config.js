const palette = require('@opsflow/ui/palette.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind on web throws at startup if anything sets the colour scheme
  // while dark mode is the default `media` strategy; Expo Router does.
  darkMode: 'class',
  theme: {
    extend: {
      // The same values the web reads from @opsflow/ui/tokens.css, so
      // `bg-tone-info` and `text-tone-info-foreground` mean one thing on both.
      colors: {
        neutral: palette.neutral,
        tone: palette.tone,
      },
    },
  },
  plugins: [],
}
