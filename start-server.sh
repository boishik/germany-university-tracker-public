#!/usr/bin/env sh
cd "$(dirname "$0")"
printf '%s\n' 'Open http://localhost:8000 in your browser.'
python3 -m http.server 8000
