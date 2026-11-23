# Build notes

## Known environment issues (already handled)

1. **Old `npm.taobao.org` mirror has an invalid certificate.**  
   The build script uses `https://registry.npmmirror.com/-/binary/electron/` instead.

2. **npm 11 may skip Electron's postinstall script.**  
   `build-installer.bat` runs `npm install-scripts approve electron`, then repairs the binary with `fix-electron.ps1` if needed.

3. **7-Zip cannot create macOS symlinks from `winCodeSign` archive without admin rights.**  
   `fix-7za.ps1` compiles a tiny wrapper that ignores only those symlink errors, so electron-builder can continue.

## Build

```powershell
.\build-installer.bat
```

The English NSIS installer is written to:

```
dist\Al2zTweaker Setup 1.0.0.exe
```

## Manual steps (if needed)

```powershell
$env:ELECTRON_MIRROR='https://registry.npmmirror.com/-/binary/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://registry.npmmirror.com/-/binary/electron-builder-binaries/'
npm install
npm install-scripts approve electron
node node_modules\electron\install.js
.\fix-electron.ps1
.\fix-7za.ps1
npm run dist
```

## Installer settings

- Language: English (`nsis.language = 1033`)
- Per-machine install
- Admin elevation allowed
- Desktop and Start menu shortcuts
- App ID: `com.al2z.tweaker`
- Product name: `Al2zTweaker`
