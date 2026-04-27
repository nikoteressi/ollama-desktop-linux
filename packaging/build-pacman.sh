#!/usr/bin/env bash
# build-pacman.sh — Build a pacman .pkg.tar.zst for alpaka-desktop from the
# current git tree. Run from anywhere; the script locates the repo root via
# the path of this script itself.
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKGBUILD_SRC="$SCRIPT_DIR/pacman/PKGBUILD"
OUT_DIR="$SCRIPT_DIR/out"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
step()    { echo -e "${YELLOW}[STEP]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Read pkgver from package.json (no jq required)
# ---------------------------------------------------------------------------
PKGVER="$(grep -m1 '"version"' "$REPO_ROOT/package.json" \
    | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"

if [[ -z "$PKGVER" ]]; then
    error "Could not determine pkgver from package.json"
    exit 1
fi

PKGNAME="alpaka-desktop"
TARBALL_NAME="${PKGNAME}-${PKGVER}.tar.gz"

info "Building ${PKGNAME} v${PKGVER}"

# ---------------------------------------------------------------------------
# Warn if the working tree is dirty (git archive only captures HEAD)
# ---------------------------------------------------------------------------
if [[ -n "$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)" ]]; then
    echo -e "${YELLOW}[WARN]${NC}  Working tree has uncommitted changes." \
        "They will NOT be included in the tarball (git archive uses HEAD)."
fi

# ---------------------------------------------------------------------------
# Temporary build directory (cleaned up on exit)
# ---------------------------------------------------------------------------
BUILD_DIR="$(mktemp -d -t alpaka-pacman-XXXXXX)"
cleanup() {
    step "Cleaning up temp directory: $BUILD_DIR"
    rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Create source tarball from git HEAD
# ---------------------------------------------------------------------------
step "Creating source tarball from git HEAD → $TARBALL_NAME"
git -C "$REPO_ROOT" archive HEAD \
    --prefix="${PKGNAME}-${PKGVER}/" \
    --format=tar \
    | gzip -9 > "$BUILD_DIR/$TARBALL_NAME"

info "Tarball size: $(du -sh "$BUILD_DIR/$TARBALL_NAME" | cut -f1)"

# ---------------------------------------------------------------------------
# Copy PKGBUILD and patch pkgver to match package.json
# ---------------------------------------------------------------------------
step "Copying PKGBUILD to build directory"
cp "$PKGBUILD_SRC" "$BUILD_DIR/PKGBUILD"

# Patch pkgver in the local copy in case they diverge
sed -i "s/^pkgver=.*/pkgver=${PKGVER}/" "$BUILD_DIR/PKGBUILD"

# ---------------------------------------------------------------------------
# Run makepkg
# ---------------------------------------------------------------------------
step "Running makepkg -sf --noconfirm"
(
    cd "$BUILD_DIR"
    makepkg -sf --noconfirm
)

# ---------------------------------------------------------------------------
# Move artifacts to packaging/out/
# ---------------------------------------------------------------------------
mkdir -p "$OUT_DIR"

BUILT_PKG="$(find "$BUILD_DIR" -maxdepth 1 -name '*.pkg.tar.zst' | head -n1)"

if [[ -z "$BUILT_PKG" ]]; then
    error "makepkg did not produce a .pkg.tar.zst in $BUILD_DIR"
    exit 1
fi

DEST="$OUT_DIR/$(basename "$BUILT_PKG")"
mv "$BUILT_PKG" "$DEST"

info "Package ready: ${DEST}"
