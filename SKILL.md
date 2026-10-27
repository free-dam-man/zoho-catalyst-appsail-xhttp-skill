# zoho-catalyst-appsail-xhttp-skill

## When to use
Someone wants a **reproducible** Zoho Catalyst **AppSail** Shadowrocket/v2rayN/Xray node using **VLESS + XHTTP packet-up + TLS** with client **ALPN `http/1.1`** — not WebSocket, not h2 — because the ZGS gateway breaks WS upgrades and h2 frames.

## Do
1. Copy `deploy/`; set fresh `UUID` + `WS_PATH`/`XPATH` in `app-config.json` (from `templates/`).
2. Prefer bundling linux-amd64 `xray` beside `server.js` (10s listen budget); else allow launcher download.
3. Run zcatalyst-cli on a **VPS** (sandbox OAuth POST may hang). Device-code: browser verify page **before** minting the code; widen CLI poll if needed (`docs/TECH.md`).
4. Non-interactive: `catalyst init … --org --project -ni`; `appsail:add --source ABSOLUTE_PATH`; `deploy --only appsail:NAME -ni` (see `scripts/deploy-appsail.sh`).
5. Build URI with `scripts/make_vless_url.sh` (`type=xhttp&mode=packet-up&alpn=http/1.1`).
6. E2E: `generate_204=204` + exit IP + honesty check on large downloads. Scrub secrets before any public commit.

## Don't
- Don't use WS templates on Zoho AppSail.
- Don't ship client ALPN **h2** (frame-too-large on ZGS).
- Don't commit live UUID, hostnames with account ids, refresh tokens, `zoho.env`, or `zcfg/`.
- Don't call Zoho exit IP "真家宽".
- Don't promise bulk download / long video stability (~235KB fast-stream truncate).
- Don't upload anything from a local `secrets/` tree into the public repo.
