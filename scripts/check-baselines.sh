#!/bin/sh
# File contract from CONTRIBUTING.md and REVIEW.md. It does not compare pixels.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

require_file() {
  if [ ! -f "$1" ]; then
    printf 'missing %s\n' "$1" >&2
    exit 1
  fi
}

require_file index.html
require_file baselines/website-home.png
require_file what-is-open-cryptopay.html
require_file baselines/website-what-is-open-cryptopay.png
require_file ecosystem.html
require_file baselines/website-ecosystem.png
require_file stores.html
require_file baselines/website-stores.png
require_file 401.html

if [ -e baselines/website-401.png ]; then
  printf '401.html must not have a baseline\n' >&2
  exit 1
fi

for workflow in .github/workflows/dev.yaml .github/workflows/prd.yaml; do
  require_file "$workflow"
  if ! grep -q 'baselines/\*\*' "$workflow"; then
    printf '%s must exclude baselines/**\n' "$workflow" >&2
    exit 1
  fi
done
