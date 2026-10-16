#!/usr/bin/env bash
# Sync web assets to the existing Android project (after editing web code).
set -euo pipefail
cd "$(dirname "$0")/.."
npx cap sync android
echo "✓ Synced. Run build_android.sh to rebuild APK."
