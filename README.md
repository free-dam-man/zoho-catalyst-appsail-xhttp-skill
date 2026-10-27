# Zoho Catalyst AppSail · VLESS + XHTTP 一键复刻

> Zero-card **US datacenter** backup node on **Zoho Catalyst AppSail** (gateway `Server: ZGS`):  
> `VLESS + XHTTP packet-up + TLS` with client **ALPN = `http/1.1`** → Shadowrocket / v2rayN / Xray.

**English:** Deploy one tiny Node launcher (`deploy/`) that writes an Xray config and spawns linux-amd64 `xray` on the platform listen port. Zoho’s edge is **not** a transparent proxy — **WebSocket fails (400)**; XHTTP with negotiated **h2 fails (frame too large)**; XHTTP **packet-up + forced `alpn=http/1.1`** works (verified 2026-10-27 Asia/Shanghai, `generate_204=204`, Seattle ZOHO egress).

Sibling skills (freedom / no-walls):

- [light-cloud-xhttp-skill](https://github.com/free-dam-man/light-cloud-xhttp-skill) — Light Cloud / similar Node PaaS (`alpn=h2` often OK there)
- [homeline-residential-exit-skill](https://github.com/free-dam-man/homeline-residential-exit-skill) — VPS Mihomo 真家宽（更稳）
- [cf-sstp-home-broadband-skill](https://github.com/free-dam-man/cf-sstp-home-broadband-skill) — CF Worker MS-SSTP 免 VPS 家宽（更飘）

---

## 为什么是 XHTTP + ALPN http/1.1 / Why XHTTP + http/1.1

| Transport | On Zoho AppSail (ZGS gateway) |
|---|---|
| VLESS + WS + TLS | **Dead** — upgrade not passed through → **400** |
| VLESS + XHTTP packet-up (client ALPN **h2**) | **Dead** — gateway returns HTTP/1.1 bytes → **frame too large** |
| VLESS + **XHTTP packet-up** + client **`alpn=http/1.1`** | **Works** |

Same family as other “request-exec” gateways: skip WS; pin client ALPN to **http/1.1** (unlike Light Cloud where **h2** is often fine).

---

## 架构 / Architecture

```text
Shadowrocket / v2rayN / sing-box / Xray
   │  VLESS + XHTTP (mode=packet-up) + TLS  alpn=http/1.1
   ▼
Zoho AppSail HTTPS  (Server: ZGS)
   └─ Node launcher → writes config → spawns bundled/downloaded xray
        └─ listen on X_ZOHO_CATALYST_LISTEN_PORT (default 9000)
        └─ exit = Zoho region datacenter IP (e.g. Seattle AS2639)
```

---

## 快速复刻 / Reproduce

1. **Register** Zoho Catalyst (email OTP is enough for Free; skip card-gated trials if you want zero-card).
2. **Install** [zcatalyst-cli](https://www.npmjs.com/package/zcatalyst-cli) on a **real VPS** (sandbox OAuth **POST** to Zoho may hang forever).
3. **Login** with device-code: open the verify page in the browser **first**, then run `catalyst login`. If codes expire before you type them, widen the CLI poll window (see `docs/TECH.md`).
4. **Copy** `deploy/` and set env in `app-config.json` (from `templates/app-config.json`):

| Env | Example | Notes |
|---|---|---|
| `UUID` | fresh UUIDv4 | **never** commit live values |
| `WS_PATH` or `XPATH` | `/my-rail` | must start with `/` |
| `X_ZOHO_CATALYST_LISTEN_PORT` | platform-injected | default `9000` |

5. Prefer **bundling** linux-amd64 `xray` next to `server.js` so cold start meets the **10s listen** budget; otherwise the launcher downloads a pinned release zip.
6. **Non-interactive deploy** (absolute `--source` required):

```bash
export ORG_ID=EXAMPLE_ORG_ID PROJECT_ID=EXAMPLE_PROJECT_ID
export APPSAIL_NAME=my-xhttp-node
export SOURCE_DIR=/absolute/path/to/deploy
./scripts/deploy-appsail.sh
```

7. **Build client URL** (ALPN forced to http/1.1):

```bash
UUID=... HOST=YOUR_APPSAIL_HOST.example XPATH=/my-rail NAME=Zoho-US \
  ./scripts/make_vless_url.sh
```

Shape:

```text
vless://<UUID>@<HOST>:443?encryption=none&security=tls&sni=<HOST>&alpn=http%2F1.1&fp=chrome&type=xhttp&host=<HOST>&path=<urlencoded path>&mode=packet-up#Zoho-US
```

8. **Verify** with a real client → SOCKS → `generate_204` expect **204**. First dial after idle scale-to-zero may take a few seconds.

---

## 仓库内容 / Layout

```text
deploy/                 # AppSail source (server.js + package.json)
templates/              # app-config.json, catalyst.json, .catalystrc.example
scripts/                # deploy-appsail.sh, make_vless_url.sh
docs/TECH.md            # scrubbed field notes
SKILL.md                # agent brief
LICENSE                 # MIT
```

Defaults are **placeholders** (`CHANGE_ME`, `YOUR_APPSAIL_HOST.example`, `EXAMPLE_*`). Rotate UUID/path per deploy. Never publish live credentials, refresh tokens, `zoho.env`, or `zcfg/`.

---

## 诚实限制 / Honest limits

- Idle **~5 min scale-to-zero** → cold start on first dial.
- Free **~900 GB-minutes/month** (memory trades hours).
- **Fast single-stream downloads may truncate around ~235KB**; slow or multi-small responses OK.
- Exit IP = **Zoho datacenter region**, not residential (`真家宽` → sibling homeline / SSTP).
- Positioning: **lightweight US backup** (browse / AI / X-style). Not for large downloads or long video.
- China entry path still depends on your client / local network; this skill does not ship CF preferred-IP fronts.

---

## License

MIT — copy, fork, teach. Freedom / no-walls.
