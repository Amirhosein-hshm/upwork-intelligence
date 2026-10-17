#!/usr/bin/env bash
# Build the Lambda zip package: src/ only (code + lib). The SDK is included in the Lambda runtime.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build && mkdir -p build/pkg
cp -r src/. build/pkg/
(cd build/pkg && zip -qr ../agent.zip .)
echo "✓ Created build/agent.zip ($(du -h build/agent.zip | cut -f1))"
