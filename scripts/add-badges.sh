#!/usr/bin/env bash
set -e
BADGES="$(cat <<'TXT'
[![CI](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml)
[![Pages](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
TXT
)"
if [ -f README.md ]; then
  printf "%%s

" "$BADGES" | cat - README.md > README.tmp.md && mv README.tmp.md README.md
else
  printf "%%s
" "$BADGES" > README.md
fi
echo "Badges added to README.md"
