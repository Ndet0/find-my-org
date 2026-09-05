/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind on web throws at startup if anything sets the colour scheme
  // while dark mode is the default `media` strategy; Expo Router does.
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
