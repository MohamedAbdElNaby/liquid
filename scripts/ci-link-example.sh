#!/bin/bash
# Installs the example app's dependencies, then replaces the npm copy of this
# package with one packed from the working tree, so builds test this commit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE="@mohamed_abd_elnaby/react-native-liquid"

cd "$ROOT"
yarn prepare
DEST="${RUNNER_TEMP:-$(mktemp -d)}"
TARBALL="$DEST/$(npm pack --silent --ignore-scripts --pack-destination "$DEST" | tail -1)"

cd "$ROOT/example"
npm ci --no-audit --no-fund
TARGET="node_modules/$PACKAGE"
rm -rf "$TARGET"
mkdir -p "$TARGET"
tar -xzf "$TARBALL" -C "$TARGET" --strip-components=1
echo "Linked $PACKAGE $(node -p "require('./$TARGET/package.json').version") from this commit"
