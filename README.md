# FlowClient

A local-first Minecraft Java launcher shell built with Electron, React, and TypeScript.

## Development

```sh
npm install
npm run dev
```

Build the renderer and Electron main process with `npm run build`. Create the Windows x64 installer and portable executable with `npm run dist`; outputs go to `dist/`. Run `npm run typecheck` to check both TypeScript projects. On Linux, Windows cross-packaging may require Wine for NSIS/signing helper tools; native Linux development requires Electron's GTK, ATK, X11, GBM, and audio system libraries.

## Minecraft launching

FlowClient launches licensed Minecraft Java Edition profiles from the desktop application. PLAY uses Microsoft's device-code sign-in, verifies the Minecraft Java entitlement, fetches the official Mojang release manifest, installs Vanilla files, and can install Fabric from Fabric's official metadata. Minecraft's libraries and assets are prepared by Minecraft Launcher Core. Shared libraries/assets live in the configured Minecraft directory; each profile uses a distinct game directory for saves, options, mods, and resource packs.

Microsoft refresh/access tokens are encrypted with Electron `safeStorage` in the operating system's protected storage. On Linux this requires a working desktop keyring/secret service. Tokens are not written to `flowclient-data.json`. If secure storage is unavailable, sign-in fails rather than saving tokens unencrypted.

Use Accounts to connect a Microsoft account that owns Minecraft Java Edition, then select it globally or for an individual profile. Profiles support Vanilla and Fabric. Java executables can be detected or selected; the launcher checks the selected Minecraft release's minimum Java version and the profile's RAM allocation before downloading. Mojang's platform-specific JVM arguments are applied alongside FlowClient's configured memory and classpath. The launcher log shows download/launch output and child process state. Minecraft stdout/stderr is captured in the log panel.

Forge, NeoForge, and Quilt are not installed or launched yet. Modpack installation/catalogs, automatic Java downloads, shader loaders (such as Iris), and Modrinth integration are also not implemented. Enabled local Fabric mod files and resource-pack files are copied into their profile game directory; this does not download mods or validate mod compatibility. Local player identities remain display-only and do not authenticate.

App settings and profile metadata are stored as `flowclient-data.json` in Electron's per-user application data directory. Running the renderer outside Electron uses browser local storage as a development fallback; native launch, secure Microsoft authentication, Java detection, and native path pickers require the desktop application.
