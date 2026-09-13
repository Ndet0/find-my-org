import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Registers happy-dom's `window`, `document`, `localStorage` and the rest on
 * the global object, which is what `lib/theme.ts` reads at import.
 *
 * Preloaded by bunfig.toml when `bun test` runs in this package, and imported
 * directly by any test that needs the DOM, because `bun test` from the
 * repository root reads no per-package bunfig and so preloads nothing. The
 * guard makes the two paths meet without registering twice.
 *
 * It also replaces Bun's `fetch`, `Response` and `Headers` with happy-dom's
 * for the whole process, so a test that mocks `fetch` must build its
 * responses with the registered `Response`, as `lib/api.test.ts` does.
 */
if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register({ url: 'http://localhost:5173' })
}
