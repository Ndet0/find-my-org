const { withAppBuildGradle } = require('expo/config-plugins')

/**
 * Signs the release build with a keystore named by Gradle properties, and
 * falls back to the template's debug keystore when they are absent so a
 * fresh clone still builds. `android/` is generated (`expo prebuild
 * --clean`), so this cannot be a hand edit to app/build.gradle.
 *
 * The four properties live in ~/.gradle/gradle.properties, never in the
 * repository: OPSFLOW_UPLOAD_STORE_FILE, OPSFLOW_UPLOAD_STORE_PASSWORD,
 * OPSFLOW_UPLOAD_KEY_ALIAS and OPSFLOW_UPLOAD_KEY_PASSWORD.
 *
 * Both replacements match the SDK 57 template verbatim and throw when they
 * do not, because a silent no-op would ship a debug-signed "release".
 */

const DEBUG_CONFIG_END = "keyPassword 'android'\n        }\n"

const RELEASE_CONFIG = `${DEBUG_CONFIG_END}        release {
            if (project.hasProperty('OPSFLOW_UPLOAD_STORE_FILE')) {
                storeFile file(OPSFLOW_UPLOAD_STORE_FILE)
                storePassword OPSFLOW_UPLOAD_STORE_PASSWORD
                keyAlias OPSFLOW_UPLOAD_KEY_ALIAS
                keyPassword OPSFLOW_UPLOAD_KEY_PASSWORD
            }
        }
`

const DEBUG_RELEASE = `// Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`

const RELEASE_SIGNING =
  "signingConfig project.hasProperty('OPSFLOW_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"

module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    const { contents } = mod.modResults

    if (!contents.includes(DEBUG_CONFIG_END) || !contents.includes(DEBUG_RELEASE)) {
      throw new Error(
        'withReleaseSigning: app/build.gradle no longer matches the template this plugin patches; update the markers',
      )
    }

    mod.modResults.contents = contents
      .replace(DEBUG_CONFIG_END, RELEASE_CONFIG)
      .replace(DEBUG_RELEASE, RELEASE_SIGNING)

    return mod
  })
