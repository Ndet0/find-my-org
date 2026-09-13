import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Preloaded by bunfig.toml before every web test file. Registers happy-dom's
 * `window`, `document`, `localStorage` and the rest on the global object,
 * which is what `lib/theme.ts` reads at import.
 *
 * It also replaces Bun's `fetch`, `Response` and `Headers` with happy-dom's
 * for the whole process, so a test that mocks `fetch` must build its
 * responses with the registered `Response`, as `lib/api.test.ts` does.
 */
GlobalRegistrator.register({ url: 'http://localhost:5173' })
