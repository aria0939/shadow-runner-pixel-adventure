#!/usr/bin/env bash
# Open the Android project in Android Studio (for those who have it).
set -euo pipefail
cd "$(dirname "$0")/.."
npx cap open android
