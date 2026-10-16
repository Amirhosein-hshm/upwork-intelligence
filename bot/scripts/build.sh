#!/usr/bin/env bash
# ساخت بسته‌ی zip برای Lambda: فقط src/ (کد + lib). SDK در runtime خود Lambda هست.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build && mkdir -p build/pkg
cp -r src/. build/pkg/
(cd build/pkg && zip -qr ../agent.zip .)
echo "✓ build/agent.zip ساخته شد ($(du -h build/agent.zip | cut -f1))"
