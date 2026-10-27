# Zoho Catalyst AppSail · VLESS + XHTTP — technical notes

Condensed field notes (scrubbed). Verified pattern: **2026-10-27 Asia/Shanghai**.

## Platform (Zoho Catalyst / AppSail)

- Free tier: long-lived Free; AppSail about **900 GB-minutes/month** (256MB ≈ 58 h/mo, 128MB ≈ 117 h/mo). Overage billed per GB-minute (check current Zoho pricing).
- Paid trial credits that require a card: skip if you want zero-card.
- AppSail constraints (field-observed):
  - Memory selectable 128MB–2GB
  - Idle **~5 minutes → scale to zero**
  - Process must **start listening within ~10 seconds**
  - Single request timeout ~30 s (XHTTP long sessions can still survive if not burst-truncated)
  - Listen port from env `X_ZOHO_CATALYST_LISTEN_PORT` (default `9000`)
  - Max ~5 services per project (confirm in console)
- Gateway identifies as **`Server: ZGS`** and often adds `X-Catalyst-Exec-ID` (function-style exec, not transparent L4).

## Deploy path that worked

Console file-upload automation was unreliable. Use **zcatalyst-cli** on a real VPS (sandbox → `accounts.zoho.com/oauth/*` **POST can hang forever**; GET may work — move the CLI).

1. Device-code OAuth: put the **browser on the verify page first**, then start `catalyst login`. Zoho codes last ~**5 minutes**; stock CLI may poll only ~70 s — if codes expire before you type them, raise the poll limit in the CLI copy’s `login.js` (e.g. 30 → 900) and re-login.
2. Non-interactive init **requires both** `--org` and `--project`:
   ```bash
   catalyst init project --org EXAMPLE_ORG_ID --project EXAMPLE_PROJECT_ID -ni
   ```
   (`project:use -ni` alone may error for missing input.)
3. AppSail source path must be **absolute**:
   ```bash
   catalyst appsail:add --name YOUR_APPSAIL_NAME --source /ABS/PATH/deploy --command "node server.js" -ni
   ```
4. `app-config.json` schema (CLI-reversed, placeholders only):

   | Field | Example |
   |---|---|
   | `command` | `node server.js` |
   | `build_path` | `.` |
   | `stack` | `node24` |
   | `memory` | `256` |
   | `env_variables` | `UUID`, `WS_PATH` |
   | `scripts` | `{}` |

5. Deploy:
   ```bash
   catalyst deploy --only appsail:YOUR_APPSAIL_NAME -ni
   ```
6. Prefer `nohup` + log files when SSH rides an egress proxy (Broken pipe on long CLI calls).

## Transport: three rounds

| Round | Transport | Result |
|---|---|---|
| 1 | VLESS + **WebSocket** | ❌ Gateway returns **400** (upgrade not passed through) |
| 2 | VLESS + **XHTTP packet-up** (client negotiates **h2**) | ❌ `http2: frame too large` (gateway speaks HTTP/1.1 bytes) |
| 3 | XHTTP packet-up + client **ALPN forced `http/1.1`** | ✅ `generate_204=204` |

Root cause: ZGS is request-exec style, not a transparent proxy. Same family as other gateway PaaS: **skip WS; use XHTTP packet-up; pin client ALPN to http/1.1**.

## Acceptance & known limits

Must-test trio with a real client (Xray/sing-box socks):

1. Connectivity: `generate_204` → HTTP **204**
2. Exit IP / city / ASN (datacenter Zoho region, not residential)
3. Bulk transfer honesty check

Observed limits (treat as **lightweight US backup**):

- Idle scale-to-zero ~5 min → cold start on first dial
- Free 900 GB-min/mo
- **Fast single-stream downloads may truncate around ~235KB**; slow/limited or multi-small responses OK; browsing / AI / X-style use usually fine; large downloads / long video unstable

## Reusable lessons

1. Gateway platforms (custom `Server` header, per-request exec) → XHTTP + ALPN http/1.1 first; do not burn cycles on WS.
2. Device-code OAuth: browser ready before code mint; trust page TTL over CLI poll window; patch poll if needed.
3. Sandbox OAuth POST hangs → run CLI on a VPS.
4. Reverse CLI config schema once (`app-config.json`, absolute `--source`, `--org`+`--project`) instead of blind retries.
5. Never publish live UUID, refresh tokens, `zoho.env`, or `zcfg/`.

## Sibling skills

- [light-cloud-xhttp-skill](https://github.com/free-dam-man/light-cloud-xhttp-skill) — Light Cloud / similar Node PaaS (ALPN often **h2** there)
- [homeline-residential-exit-skill](https://github.com/free-dam-man/homeline-residential-exit-skill) — VPS Mihomo 真家宽
- [cf-sstp-home-broadband-skill](https://github.com/free-dam-man/cf-sstp-home-broadband-skill) — CF Worker MS-SSTP home broadband
