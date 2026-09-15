import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { Store } from '../backend/store.mjs';
import { Controller } from '../backend/controller.mjs';
import { Geocoder } from '../backend/geocoder.mjs';
import { IosAdapter } from '../backend/ios.mjs';
import { AndroidAdapter } from '../backend/android.mjs';

// Headless replacement for electron/main.mjs: same Controller, same backend
// adapters, no Electron. Meant to run on a small Linux board (e.g. a
// Raspberry Pi CM4) that acts as its own Wi-Fi access point; the phone
// connects to that AP and opens this server's address in Safari/Chrome.
// There is no OS-level sandbox here, so this must only ever bind to the
// device's own AP interface, never to a shared or internet-facing network.

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distPath = path.join(rootPath, 'dist');
const PORT = Number(process.env.GHOST_HEADLESS_PORT || 8080);
const BIND = process.env.GHOST_HEADLESS_BIND || '0.0.0.0'; // set to the AP interface's address in production

if (!existsSync(path.join(distPath, 'index.html'))) {
  console.error('Build the interface first: npm run build');
  process.exit(1);
}

const geocoder = new Geocoder();
const options = { rootPath, resourcesPath: path.join(rootPath, 'resources') };
const callbacks = { onSessionEnd: event => controller?.sessionEnded(event), onLocationRefresh: event => controller?.locationRefreshed(event) };
const ios = new IosAdapter({ ...options, ...callbacks });
const android = new AndroidAdapter({ ...options, ...callbacks });
const controller = new Controller({
  adapters: { ios, android },
  store: new Store(path.join(rootPath, '.ghost-headless', 'settings.json')),
  // The board's own Wi-Fi AP is always "up" from its own point of view; the
  // desktop app's wifiStatus() answers a different question (does THIS
  // computer have Wi-Fi) that doesn't apply to a board that only ever runs
  // its own hotspot.
  network: async () => ({ wifi: true }),
});

// --- JSON-RPC-ish HTTP surface, mirroring electron/preload.cjs's window.ghost API ---
const handlers = {
  getState: () => controller.snapshot(),
  switchToWifi: id => controller.switchToWifi(id),
  setConnection: value => controller.setConnection(value),
  connectWifi: value => controller.connectWifi(value),
  scanDevices: () => controller.scanDevices(),
  prepareDevice: id => controller.prepareDevice(id),
  applyLocation: value => controller.applyLocation(value),
  stopLocation: () => controller.stopLocation(),
  getRoute: () => controller.getRoute(),
  planRoute: value => controller.planRoute(value),
  startRoute: value => controller.startRoute(value),
  pauseRoute: () => controller.pauseRoute(),
  resumeRoute: () => controller.resumeRoute(),
  searchPlaces: query => { geocoder.configure(controller.state.preferences.geocoderUrl || 'https://photon.komoot.io/api/'); return geocoder.search(query); },
  savePlace: value => controller.savePlace(value),
  deletePlace: id => controller.deletePlace(id),
  updatePreferences: value => controller.updatePreferences(value),
};

const sseClients = new Set();
controller.on('state', state => {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients) res.write(payload);
});

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

async function serveStatic(req, res, pathname) {
  const target = path.resolve(distPath, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!target.startsWith(`${distPath}${path.sep}`) && target !== distPath) { res.writeHead(404).end('Not found'); return; }
  try {
    let body = await readFile(target);
    if (target.endsWith('index.html')) {
      // Inject the browser-side window.ghost bridge before the app bundle runs.
      body = Buffer.from(body.toString('utf8').replace('</head>', '<script src="/ghost-bridge.js"></script></head>'));
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/ghost-bridge.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(await readFile(path.join(rootPath, 'headless', 'bridge.js')));
    return;
  }

  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(controller.snapshot())}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (url.pathname.startsWith('/api/') && req.method === 'POST') {
    const method = url.pathname.slice('/api/'.length);
    const handler = handlers[method];
    if (!handler) { res.writeHead(404).end(JSON.stringify({ ok: false, error: 'Unknown method.' })); return; }
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 1_000_000) { res.writeHead(413).end(); return; } }
    let value;
    try { value = body ? JSON.parse(body) : undefined; }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: 'Invalid request body.' })); return; }
    try {
      const data = await handler(value);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, data }));
    } catch (error) {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: error.message || 'Operation failed.' }));
    }
    return;
  }

  await serveStatic(req, res, url.pathname);
});

await controller.init();
setInterval(() => controller.scanDevices().catch(error => { controller.state.warning = error.message; controller.notify(); }), 2000);

server.listen(PORT, BIND, () => {
  const addresses = Object.values(networkInterfaces()).flat().filter(a => a && !a.internal && a.family === 'IPv4').map(a => a.address);
  console.log(`Ghost headless server listening on http://${BIND}:${PORT}`);
  if (addresses.length) console.log(`Reachable at: ${addresses.map(a => `http://${a}:${PORT}`).join(', ')}`);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
async function shutdown() {
  console.log('Shutting down…');
  server.close();
  await controller.dispose({ restore: false });
  process.exit(0);
}
