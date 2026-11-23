#!/bin/bash
# Al2zTweaker - Automatic Installer Builder (Linux/macOS)
# Run with: chmod +x build-installer.sh && ./build-installer.sh

set -e

echo "================================================================"
echo "    Al2zTweaker - Automatic installer builder"
echo "================================================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo
    echo "Please install Node.js 18 LTS: https://nodejs.org/en/download/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "[WARNING] Recommended Node.js 18 LTS. Current version: $NODE_VERSION"
fi

echo "[1/5] Cleaning previous builds..."
rm -rf node_modules package-lock.json dist build
if [ -f "dist/Al2zTweaker Setup 1.0.0.exe" ]; then
    rm -f "dist/Al2zTweaker Setup 1.0.0.exe"
fi

echo "[2/5] Setting up Electron mirror (faster download)..."
export ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://registry.npmmirror.com/-/binary/electron-builder-binaries/"

echo "[3/5] Installing dependencies..."
npm install --no-audit --no-fund

echo "[4/5] Building installer..."
npm run dist

echo "[5/5] Build completed!"
echo
echo "================================================================"
echo "    RESULT:"
echo
if [ -f "dist/Al2zTweaker Setup 1.0.0.exe" ]; then
    echo "[SUCCESS] Installer created:"
    echo "    dist/Al2zTweaker Setup 1.0.0.exe"
    echo
    echo "Size: $(du -h "dist/Al2zTweaker Setup 1.0.0.exe" | cut -f1)"
    echo
    echo "🚀 Run the installer AS ADMINISTRATOR!"
else
    echo "[WARNING] Installer not found in dist/"
    echo "Check dist/ folder manually"
fi
echo
echo "================================================================"
echo "    INSTALLER FEATURES:"
echo "    • Requires administrator rights"
echo "    • Removes UWP apps (Remove-AppxPackage)"
echo "    • Removes Win32 programs"
echo "    • Creates system restore point"
echo "    • Restarts Explorer"
echo "    • Built-in admin rights check"
echo
echo "📁 Usage order:"
echo "    1. Run 'Al2zTweaker Setup 1.0.0.exe'"
echo "    2. Install the program"
echo "    3. Run as administrator"
echo "    4. Use 'UWP Apps' and 'Programs' sections"
echo
echo "Happy tweaking! 🎉"