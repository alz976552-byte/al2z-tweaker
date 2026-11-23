# Al2zTweaker — build guide

This folder contains an Electron desktop app with an English NSIS installer.

## Quick build (Windows)

1. Open **Terminal (Admin)** in this folder.
2. Run:

```powershell
.\build-installer.bat
```

The installer appears in `dist\Al2zTweaker Setup 1.0.0.exe`.

The build script automatically:
- uses working Electron mirrors (`registry.npmmirror.com`),
- approves/repairs the Electron binary if npm skips its postinstall script,
- builds the English NSIS installer.

## Manual build

```powershell
$env:ELECTRON_MIRROR='https://registry.npmmirror.com/-/binary/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://registry.npmmirror.com/-/binary/electron-builder-binaries/'
npm install
npm run dist
```

If `electron.exe` is missing after `npm install`, run:

```powershell
npm install-scripts approve electron
node node_modules\electron\install.js
```

If that still fails, run `.\fix-electron.ps1` to extract the cached archive.

## Run without installing

```powershell
$env:ELECTRON_MIRROR='https://registry.npmmirror.com/-/binary/electron/'
npm install
npx electron .
```

## Features

- Liquid-glass macOS-style UI (dark/light themes)
- Tweaks and presets
- Live resource monitoring
- **UWP app removal** (`Get-AppxPackage` / `Remove-AppxPackage`, including all users)
- **Win32 program uninstall** via standard uninstall strings
- System restore point creation
- English installer, installed per-machine, admin elevation allowed

## Notes

- Run the app as Administrator to remove UWP apps and change system settings.
- The installer language is English (NSIS language ID 1033).
