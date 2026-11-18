#!/usr/bin/env bash
# Runs on every Codespace start so the Postman CLI is always logged in.
# Needs the POSTMAN_API_KEY Codespaces secret (github.com/settings/codespaces).

if [ -z "${POSTMAN_API_KEY:-}" ]; then
  echo "POSTMAN_API_KEY not set; add it as a Codespaces secret (with access to this repo), or run: postman login --with-api-key <key>"
  exit 0
fi

postman login --with-api-key "$POSTMAN_API_KEY" \
  && echo "Postman CLI logged in" \
  || echo "Postman login failed; check that POSTMAN_API_KEY is a valid API key"
