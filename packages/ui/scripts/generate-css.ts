import { writeFileSync } from 'node:fs'
import { colors } from '../src/colors'

/**
 * Emits `src/tokens.css` from `palette.json` so the web app's Tailwind 4
 * build reads the same values the mobile app does. Plain `@theme`, not
 * `@theme inline`: the utilities then reference `var(--color-tone-info)`,
 * so the `.dark { … }` block below recolours every tone utility without a
 * second set of class names. Committed; CI regenerates it and fails on any
 * diff.
 *
 * The `dark` pair of each tone is not a token of its own on the web — it
 * only feeds the override block. Mobile reads the same pair as
 * `bg-tone-info-dark` behind a `dark:` variant, because NativeWind has no
 * cascade to override a variable with.
 */
const lines: string[] = [
  '/* Generated from palette.json by `pnpm --filter @opsflow/ui generate`. Do not edit. */',
  '@theme {',
]

for (const [step, hex] of Object.entries(colors.neutral)) {
  lines.push(`  --color-neutral-${step}: ${hex};`)
}

for (const [tone, values] of Object.entries(colors.tone)) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string') continue
    lines.push(`  --color-tone-${tone}${key === 'DEFAULT' ? '' : `-${key}`}: ${value};`)
  }
}

lines.push('}', '', '.dark {')

for (const [tone, values] of Object.entries(colors.tone)) {
  lines.push(`  --color-tone-${tone}: ${values.dark.DEFAULT};`)
  lines.push(`  --color-tone-${tone}-foreground: ${values.dark.foreground};`)
}

lines.push('}', '')

writeFileSync(new URL('../src/tokens.css', import.meta.url), lines.join('\n'))
console.log(
  `tokens.css: ${Object.keys(colors.neutral).length} neutral steps, ${Object.keys(colors.tone).length} tones, light and dark`,
)
