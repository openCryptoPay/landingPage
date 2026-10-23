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

require_exact_line() {
  file=$1
  pattern=$2
  if ! awk -v pat="$pattern" '
    {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      if (line == pat) found = 1
    }
    END { exit found ? 0 : 1 }
  ' "$file"; then
    printf '%s must exclude %s\n' "$file" "$pattern" >&2
    exit 1
  fi
}

require_file index.html
require_file baselines/website-home.png
require_file baselines/website-home-activity.png
require_file baselines/website-home-daily.png
require_file baselines/website-home-table.png
require_file what-is-open-cryptopay.html
require_file baselines/website-what-is-open-cryptopay.png
require_file ecosystem.html
require_file baselines/website-ecosystem.png
require_file stores.html
require_file baselines/website-stores.png
require_file baselines/website-stores-activity.png
require_file baselines/website-stores-daily.png
require_file baselines/website-stores-table.png
require_file shop.php
require_file baselines/website-shop.png
require_file 401.html

if [ -e baselines/website-401.png ]; then
  printf '401.html must not have a baseline\n' >&2
  exit 1
fi

for workflow in .github/workflows/dev.yaml .github/workflows/prd.yaml; do
  require_file "$workflow"
  require_exact_line "$workflow" 'baselines/**'
  require_exact_line "$workflow" '**/baselines/**'
done
