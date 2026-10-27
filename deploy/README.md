# deploy/ — AppSail service source

Copy this directory as the AppSail `--source` (absolute path).

## Files

| File | Role |
|---|---|
| `server.js` | Writes Xray VLESS+XHTTP `packet-up` config; spawns `./xray` |
| `package.json` | Node 24 / `npm start` → `node server.js` |
| `xray` *(you add)* | Prefer bundling **linux amd64** `xray` so cold start meets the **10s listen** budget. If absent, `server.js` downloads a pinned Xray-core release zip. |

## Env (set in `app-config.json` → `env_variables`)

| Key | Example | Notes |
|---|---|---|
| `UUID` | fresh UUIDv4 | **never** commit a live value |
| `WS_PATH` or `XPATH` | `/my-rail` | Must start with `/` |
| `X_ZOHO_CATALYST_LISTEN_PORT` | injected by platform | Default `9000` if unset |

## Client ALPN

Shadowrocket / Xray URI **must** include `alpn=http/1.1` (not `h2`). See `../scripts/make_vless_url.sh`.
