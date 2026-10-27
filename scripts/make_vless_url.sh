#!/usr/bin/env bash
# Print a Shadowrocket / Xray VLESS+XHTTP packet-up URL for Zoho AppSail.
# Client ALPN MUST be http/1.1 (h2 fails on ZGS gateway with "frame too large").
#
# Usage:
#   UUID=... HOST=YOUR_APPSAIL_HOST.example XPATH=/my-rail NAME=Zoho-US \
#     ./scripts/make_vless_url.sh
#
# Env: UUID (required), HOST (required), XPATH or WS_PATH (default /CHANGE_ME),
#      NAME (default Zoho-AppSail), PORT (default 443), FP (default chrome)
set -euo pipefail

: "${UUID:?set UUID}"
: "${HOST:?set HOST (AppSail public hostname, e.g. YOUR_APPSAIL_HOST.example)}"
export UUID HOST
export XPATH_VAL="${XPATH:-${WS_PATH:-/CHANGE_ME}}"
export NAME="${NAME:-Zoho-AppSail}"
export PORT="${PORT:-443}"
export FP="${FP:-chrome}"

python3 - <<'PY'
import os, urllib.parse
uuid = os.environ["UUID"]
host = os.environ["HOST"]
xpath = os.environ["XPATH_VAL"]
name = os.environ["NAME"]
port = os.environ["PORT"]
fp = os.environ["FP"]
enc_path = urllib.parse.quote(xpath, safe="")
enc_name = urllib.parse.quote(name, safe="")
alpn = urllib.parse.quote("http/1.1", safe="")
print(
    f"vless://{uuid}@{host}:{port}"
    f"?encryption=none&security=tls&sni={host}&alpn={alpn}&fp={fp}"
    f"&type=xhttp&host={host}&path={enc_path}&mode=packet-up#{enc_name}"
)
PY
