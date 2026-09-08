import { writeFileSync } from 'node:fs'
import { colors } from '../src/colors'

/**
 * Emits `src/tokens.css` from `palette.json` so the web app's Tailwind 4
 * build reads the same values the mobile app does. Plain `@theme`, not
 * `@theme inline`: the utilities then reference `var(--color-tone-info)`,
 * which a later `.dark { … }` block can override without touching this
 * file. Committed; CI regenerates it and fails on any diff.
 */
const lines: string[] = [
  '/* Generated from palette.json by `pnpm --filter @opsflow/ui generate`. Do not edit. */',
  '@theme {',
]

for (const [step, hex] of Object.entries(colors.neutral)) {
  lines.push(`  --color-neutral-${step}: ${hex};`)
}

for (const [tone, pair] of Object.entries(colors.tone)) {
  lines.push(`  --color-tone-${tone}: ${pair.DEFAULT};`)
  lines.push(`  --color-tone-${tone}-foreground: ${pair.foreground};`)
}

lines.push('}', '')

writeFileSync(new URL('../src/tokens.css', import.meta.url), lines.join('\n'))
console.log(
  `tokens.css: ${Object.keys(colors.neutral).length} neutral steps, ${Object.keys(colors.tone).length} tones`,
)
