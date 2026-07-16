#!/usr/bin/env bash
# scripts/seed-rocm-libs.sh
#
# Seeds ROCm WSL2 libraries into the ignis_job_data Docker volume.
# Must be run from WSL2 (Ubuntu) after `docker compose up -d`.
#
# Required once on first setup. Re-run after `docker compose down -v`.
#
# Usage:
#   bash scripts/seed-rocm-libs.sh

set -euo pipefail

VOLUME="ignis_job_data"
LIBROCDXG="/opt/rocm/lib/librocdxg.so"
LIBDXCORE="/usr/lib/wsl/lib/libdxcore.so"
ROCDXG_DIR="/opt/rocm/share/rocdxg"

echo "==> Checking prerequisites..."

# Check volume exists
if ! docker volume inspect "$VOLUME" > /dev/null 2>&1; then
    echo "ERROR: Docker volume '$VOLUME' not found."
    echo "       Run 'docker compose up -d' first, then re-run this script."
    exit 1
fi

# Check source files exist
for path in "$LIBROCDXG" "$LIBDXCORE" "$ROCDXG_DIR"; do
    if [ ! -e "$path" ]; then
        echo "ERROR: Required file/directory not found: $path"
        echo "       Make sure ROCm 7.2.1 and librocdxg v1.2.0 are installed in WSL2."
        exit 1
    fi
done

echo "==> Seeding ROCm libraries into volume '$VOLUME'..."

docker run --rm \
    -v "${VOLUME}:/data/jobs" \
    -v "${LIBROCDXG}:/src/librocdxg.so" \
    -v "${LIBDXCORE}:/src/libdxcore.so" \
    -v "${ROCDXG_DIR}:/src/rocdxg" \
    alpine sh -c "cp /src/librocdxg.so /src/libdxcore.so /data/jobs/ && cp -r /src/rocdxg /data/jobs/"

echo "==> Verifying..."

RESULT=$(docker run --rm -v "${VOLUME}:/data/jobs" alpine ls /data/jobs)

for file in librocdxg.so libdxcore.so rocdxg; do
    if echo "$RESULT" | grep -q "$file"; then
        echo "    ✓ $file"
    else
        echo "    ✗ $file — MISSING"
        exit 1
    fi
done

echo ""
echo "Done. ROCm libraries are seeded and ready."
echo "Training containers will use GPU via ROCDXG (/dev/dxg)."
