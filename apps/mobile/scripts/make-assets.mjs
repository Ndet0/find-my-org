// Generates the app icon set under `apps/mobile/assets` with nothing but Node:
// a procedural mark (three stacked pills — a task list, a flow) rendered onto
// hand-encoded PNGs. Re-run with `pnpm --filter @opsflow/mobile assets` after
// changing the palette; the colours are the neutral scale the mobile
// components hard-code until `packages/ui` design tokens exist (Phase 14).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const INK = [0x17, 0x17, 0x17]
const WHITE = [0xff, 0xff, 0xff]

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

/** The mark in unit terms: pill widths relative to the mark width. */
const MARK = {
  bar: 0.2, // pill height
  gap: 0.17, // vertical gap between pills
  widths: [1, 0.72, 0.46],
}
const MARK_HEIGHT = MARK.bar * MARK.widths.length + MARK.gap * (MARK.widths.length - 1)

/**
 * Coverage of one pixel by the mark, by supersampling. `left`/`top` place the
 * mark's bounding box; `width` is the mark width in pixels.
 */
function coverage(px, py, { left, top, width }, samples) {
  const bar = MARK.bar * width
  const gap = MARK.gap * width
  const radius = bar / 2
  let inside = 0

  for (let sy = 0; sy < samples; sy++) {
    for (let sx = 0; sx < samples; sx++) {
      const x = px + (sx + 0.5) / samples
      const y = py + (sy + 0.5) / samples

      for (let i = 0; i < MARK.widths.length; i++) {
        const pillTop = top + i * (bar + gap)
        const pillWidth = MARK.widths[i] * width
        // Distance from the pill's centre segment; inside when within the radius.
        const cx = Math.min(Math.max(x, left + radius), left + pillWidth - radius)
        const cy = pillTop + radius
        const dx = x - cx
        const dy = y - cy

        if (dx * dx + dy * dy <= radius * radius) {
          inside++
          break
        }
      }
    }
  }

  return inside / (samples * samples)
}

/**
 * Renders one square canvas. `background` is an RGB triple or null for
 * transparency; `markWidth` is the mark's width as a fraction of the canvas.
 */
function render({ size, background, ink, markWidth, samples = 4 }) {
  const width = markWidth * size
  const box = {
    width,
    left: (size - width) / 2,
    top: (size - MARK_HEIGHT * width) / 2,
  }
  const rgba = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, box, samples)
      const offset = (y * size + x) * 4

      if (background) {
        for (let c = 0; c < 3; c++) {
          rgba[offset + c] = Math.round(background[c] + (ink[c] - background[c]) * a)
        }
        rgba[offset + 3] = 255
      } else {
        rgba[offset] = ink[0]
        rgba[offset + 1] = ink[1]
        rgba[offset + 2] = ink[2]
        rgba[offset + 3] = Math.round(255 * a)
      }
    }
  }

  return { size, rgba }
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, crc])
}

/** Encodes 8-bit RGBA as a PNG: one unfiltered scanline per row. */
function encodePng({ size, rgba }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  header[10] = 0 // compression
  header[11] = 0 // filter
  header[12] = 0 // interlace

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const ASSETS = {
  // iOS masks the corners itself: opaque, square, no transparency.
  'icon.png': { size: 1024, background: INK, ink: WHITE, markWidth: 0.56 },
  // Android composes this over `adaptiveIcon.backgroundColor`; the mark stays
  // inside the central 66% safe zone that every launcher shape keeps.
  'adaptive-icon.png': { size: 1024, background: null, ink: WHITE, markWidth: 0.44 },
  // Shown by expo-splash-screen at `imageWidth` on the splash background.
  'splash-icon.png': { size: 1024, background: null, ink: INK, markWidth: 0.86 },
  // Expo CLI turns this into favicon.ico for the web build.
  'favicon.png': { size: 48, background: INK, ink: WHITE, markWidth: 0.6, samples: 8 },
}

mkdirSync(assetsDir, { recursive: true })

for (const [name, spec] of Object.entries(ASSETS)) {
  const png = encodePng(render(spec))
  writeFileSync(join(assetsDir, name), png)
  console.log(`${name}  ${spec.size}x${spec.size}  ${png.length} bytes`)
}
