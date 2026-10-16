#!/usr/bin/env bash
# Build the Android APK for Shadow Runner.
# Prereqs: Node 18+, JDK 17, Android SDK with build-tools 34.
# Run this once after cloning the repo:
#   npm install
#   bash scripts/build_android.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# 1. Install Capacitor (if not present)
if ! npx cap --version >/dev/null 2>&1; then
  echo "→ Installing Capacitor..."
  npm install
fi

# 2. Add Android platform (idempotent)
if [ ! -d "android" ]; then
  echo "→ Adding Android platform..."
  npx cap add android
fi

# 3. Sync web assets
echo "→ Syncing web assets to Android..."
npx cap sync android

# 4. Build the debug APK with Gradle
echo "→ Building debug APK (this may take 5-10 minutes the first time)..."
cd android
./gradlew assembleDebug

echo ""
echo "✓ Build complete!"
echo "  APK location: android/app/build/outputs/apk/debug/app-debug.apk"
