#!/usr/bin/env bash
# Non-interactive Zoho Catalyst AppSail deploy sketch (zcatalyst-cli).
#
# Prereqs:
#   - zcatalyst-cli installed on a machine that can POST to accounts.zoho.com
#     (sandbox OAuth POST may hang — run CLI on a real VPS, not a locked sandbox)
#   - Logged in (`catalyst login`); device-code: put the browser on the verify
#     page FIRST, then start login. If the CLI poll window (~70s) is shorter than
#     Zoho's code TTL (~5 min), patch login.js poll limit upward (e.g. 30 → 900).
#   - Absolute path to deploy/ source (relative --source fails)
#
# Env (EXAMPLE placeholders — replace with your console values):
#   ORG_ID=EXAMPLE_ORG_ID
#   PROJECT_ID=EXAMPLE_PROJECT_ID
#   APPSAIL_NAME=my-xhttp-node
#   SOURCE_DIR=/absolute/path/to/this/repo/deploy
#
# Usage: ORG_ID=... PROJECT_ID=... SOURCE_DIR=... ./scripts/deploy-appsail.sh
set -euo pipefail

ORG_ID="${ORG_ID:?set ORG_ID (EXAMPLE — from Catalyst console)}"
PROJECT_ID="${PROJECT_ID:?set PROJECT_ID (EXAMPLE — from Catalyst console)}"
APPSAIL_NAME="${APPSAIL_NAME:-xhttp-node}"
SOURCE_DIR="${SOURCE_DIR:?set SOURCE_DIR to an ABSOLUTE path of deploy/}"

if [[ "${SOURCE_DIR}" != /* ]]; then
  echo "SOURCE_DIR must be absolute, got: ${SOURCE_DIR}" >&2
  exit 1
fi
if [[ ! -f "${SOURCE_DIR}/server.js" ]]; then
  echo "SOURCE_DIR missing server.js: ${SOURCE_DIR}" >&2
  exit 1
fi

# Prefer detached runs when SSH is flaky through an egress proxy.
run() {
  echo "+ $*"
  "$@"
}

WORKDIR="${WORKDIR:-$(pwd)/.catalyst-work}"
mkdir -p "${WORKDIR}"
cd "${WORKDIR}"

# 1) Init project binding (non-interactive needs BOTH --org and --project)
if [[ ! -f .catalystrc ]]; then
  run catalyst init project --org "${ORG_ID}" --project "${PROJECT_ID}" -ni
fi

# 2) Register AppSail target (absolute --source required)
if [[ ! -f catalyst.json ]]; then
  run catalyst appsail:add --name "${APPSAIL_NAME}" --source "${SOURCE_DIR}" --command "node server.js" -ni
fi

# 3) Ensure app-config.json exists beside the source (CLI also writes one;
#    templates/app-config.json is the documented schema).
if [[ ! -f "${SOURCE_DIR}/app-config.json" ]]; then
  echo "Copy templates/app-config.json → ${SOURCE_DIR}/app-config.json and set UUID / WS_PATH" >&2
  exit 1
fi

# 4) Deploy only this AppSail
run catalyst deploy --only "appsail:${APPSAIL_NAME}" -ni

echo "Done. Set client ALPN=http/1.1 via scripts/make_vless_url.sh"
