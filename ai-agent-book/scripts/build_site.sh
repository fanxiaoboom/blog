#!/usr/bin/env bash
# Boomoo Space change (2026-07): build only the Chinese reading edition.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/_web"

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$ROOT/index.md" "$DEST/index.md"
cp "$ROOT/robots.txt" "$DEST/robots.txt"
cp -R "$ROOT/book" "$DEST/book"
mkdir -p "$DEST/extras"
cp "$ROOT/extras/book-theme.css" "$DEST/extras/book-theme.css"
cp "$ROOT/extras/nav-collapse.js" "$DEST/extras/nav-collapse.js"
cp "$ROOT/extras/learning-progress.js" "$DEST/extras/learning-progress.js"
cp "$ROOT/extras/mermaid-init.js" "$DEST/extras/mermaid-init.js"
cp -R "$ROOT/assets" "$DEST/assets"

echo "Assembled Chinese reading edition into $DEST"
