import palette from './palette.json'

/**
 * The colour values both clients agree on. `palette.json` is the single
 * source of truth so that the mobile Tailwind config, the Expo app config
 * and the icon script can `require` it as plain JSON; this module is the
 * typed view for TypeScript callers.
 *
 * `neutral` is the grey scale the mobile components are built on. `tone`
 * is the semantic set used for status and priority badges: a background
 * (`DEFAULT`) and a text colour (`foreground`) per tone. The web's shadcn
 * surface variables are not part of this palette; see technical
 * architecture §18.
 */
export const colors = palette

export type NeutralStep = keyof typeof palette.neutral
export type Tone = keyof typeof palette.tone

/** `#rrggbb` → `[r, g, b]`, for callers that paint pixels rather than CSS. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}
