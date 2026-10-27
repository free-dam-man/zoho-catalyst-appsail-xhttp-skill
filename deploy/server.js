#!/usr/bin/env node
/**
 * Zoho Catalyst AppSail · VLESS + XHTTP packet-up launcher
 *
 * Reads:
 *   X_ZOHO_CATALYST_LISTEN_PORT  (default 9000) — platform-injected listen port
 *   UUID                         — VLESS client id (placeholder CHANGE_ME)
 *   WS_PATH or XPATH             — XHTTP path, e.g. /CHANGE_ME
 *
 * Writes a runtime Xray config, ensures a linux-amd64 `xray` binary is present
 * (prefer bundled ./xray; else download within the AppSail 10s listen budget),
 * then execs xray so it listens on the platform port.
 *
 * Client MUST use ALPN http/1.1 (not h2). Zoho ZGS gateway is not a transparent
 * proxy: WS upgrades fail with 400; XHTTP with negotiated h2 fails frame-too-large.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { createWriteStream } = require('fs');
const { execFileSync } = require('child_process');
const zlib = require('zlib');

const pipe = promisify(pipeline);

const PORT = Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000);
const UUID = process.env.UUID || 'CHANGE_ME';
const RAW_PATH = process.env.WS_PATH || process.env.XPATH || '/CHANGE_ME';
const XPATH = RAW_PATH.startsWith('/') ? RAW_PATH : `/${RAW_PATH}`;

const HERE = __dirname;
const XRAY_BIN = path.join(HERE, 'xray');
const CONFIG_PATH = path.join(HERE, 'xray-config.json');

// Official Xray-core release (pin a known-good amd64 zip). Override with XRAY_ZIP_URL.
const XRAY_ZIP_URL =
  process.env.XRAY_ZIP_URL ||
  'https://github.com/XTLS/Xray-core/releases/download/v25.10.15/Xray-linux-64.zip';

function die(msg) {
  console.error(`[zoho-xhttp] FATAL: ${msg}`);
  process.exit(1);
}

function buildConfig() {
  return {
    log: { loglevel: process.env.XRAY_LOGLEVEL || 'warning' },
    inbounds: [
      {
        listen: '0.0.0.0',
        port: PORT,
        protocol: 'vless',
        settings: {
          clients: [{ id: UUID, email: 'zoho-appsail' }],
          decryption: 'none',
        },
        streamSettings: {
          network: 'xhttp',
          xhttpSettings: {
            path: XPATH,
            mode: 'packet-up',
          },
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
        },
      },
    ],
    outbounds: [
      { protocol: 'freedom', tag: 'direct' },
      { protocol: 'blackhole', tag: 'block' },
    ],
  };
}

function fetchToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchToFile(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`download HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const out = createWriteStream(dest);
      pipe(res, out).then(resolve, reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('download timeout'));
    });
  });
}

async function ensureXray() {
  if (fs.existsSync(XRAY_BIN)) {
    try {
      fs.chmodSync(XRAY_BIN, 0o755);
    } catch (_) {}
    return;
  }

  console.log('[zoho-xhttp] no bundled ./xray — downloading linux-amd64 release…');
  const zipPath = path.join(HERE, 'xray-download.zip');
  const started = Date.now();
  await fetchToFile(XRAY_ZIP_URL, zipPath);
  // Prefer system unzip if present; else use Node zlib only for stored entries via `unzip` fallback.
  try {
    execFileSync('unzip', ['-o', '-j', zipPath, 'xray', '-d', HERE], { stdio: 'ignore' });
  } catch (e) {
    // Busybox / no unzip: try python3 zipfile
    try {
      execFileSync(
        'python3',
        [
          '-c',
          'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); z.extract("xray", sys.argv[2])',
          zipPath,
          HERE,
        ],
        { stdio: 'ignore' }
      );
    } catch (e2) {
      die(`failed to extract xray from zip (${e2.message}). Bundle ./xray in the deploy package.`);
    }
  }
  try {
    fs.unlinkSync(zipPath);
  } catch (_) {}
  if (!fs.existsSync(XRAY_BIN)) {
    die('xray binary missing after extract');
  }
  fs.chmodSync(XRAY_BIN, 0o755);
  console.log(`[zoho-xhttp] xray ready in ${Date.now() - started}ms`);
}

async function main() {
  if (!UUID || UUID === 'CHANGE_ME') {
    console.warn('[zoho-xhttp] WARNING: UUID is still CHANGE_ME — set env UUID before real use');
  }
  if (XPATH === '/CHANGE_ME') {
    console.warn('[zoho-xhttp] WARNING: path is still /CHANGE_ME — set WS_PATH or XPATH');
  }

  const cfg = buildConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  console.log(`[zoho-xhttp] config written → ${CONFIG_PATH} (port=${PORT} path=${XPATH})`);

  await ensureXray();

  const child = spawn(XRAY_BIN, ['run', '-c', CONFIG_PATH], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    console.error(`[zoho-xhttp] xray exited code=${code} signal=${signal}`);
    process.exit(code || 1);
  });

  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
}

main().catch((err) => die(err.stack || err.message));
