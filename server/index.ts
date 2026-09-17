import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './apiHandler.ts';
import { initDatabase } from './db.ts';

// Initialize SQLite database
initDatabase();

const PORT = parseInt(process.env.PORT || '5180', 10);
const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const CUSTOM_JSON_DIR = path.join(PUBLIC_DIR, 'custom-components');
const CUSTOM_JSON_FILE = path.join(CUSTOM_JSON_DIR, 'components.json');

// Ensure essential public custom directories exist
if (!fs.existsSync(CUSTOM_JSON_DIR)) {
  fs.mkdirSync(CUSTOM_JSON_DIR, { recursive: true });
}
if (!fs.existsSync(COMPONENTS_DIR)) {
  fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
}
if (!fs.existsSync(CUSTOM_JSON_FILE)) {
  fs.writeFileSync(CUSTOM_JSON_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wire': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

function readCustomComponentsJson(): Record<string, any> {
  try {
    const content = fs.readFileSync(CUSTOM_JSON_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeCustomComponentsJson(data: any) {
  fs.writeFileSync(CUSTOM_JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const server = http.createServer(async (req, res) => {
  // Global CORS & standard headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Handle Custom Components Studio API
  if (pathname.startsWith('/api/custom-components')) {
    if (req.method === 'GET') {
      const data = readCustomComponentsJson();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { definition, imageBase64 } = JSON.parse(body);
          if (!definition || !definition.type) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid definition data' }));
            return;
          }

          const safeId = definition.type.replace(/[^a-zA-Z0-9_-]/g, '_');
          let imagePublicPath = definition.imageUrl || '';

          if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image')) {
            if (imageBase64.startsWith('data:image/svg+xml')) {
              const filename = `${safeId}.svg`;
              const filepath = path.join(COMPONENTS_DIR, filename);
              let svgContent = '';
              if (imageBase64.includes(';base64,')) {
                const base64Data = imageBase64.split(';base64,')[1];
                svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');
              } else {
                const encoded = imageBase64.replace(/^data:image\/svg\+xml;?(charset=utf-8)?,?/, '');
                svgContent = decodeURIComponent(encoded);
              }
              fs.writeFileSync(filepath, svgContent, 'utf-8');
              imagePublicPath = `/components/${filename}`;
            } else {
              const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
              if (matches) {
                const rawExt = matches[1].toLowerCase();
                const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
                const filename = `${safeId}.${ext}`;
                const filepath = path.join(COMPONENTS_DIR, filename);
                const buffer = Buffer.from(matches[2], 'base64');
                fs.writeFileSync(filepath, buffer);
                imagePublicPath = `/components/${filename}`;
              }
            }
          }

          const now = new Date().toISOString();
          const currentData = readCustomComponentsJson();
          const existing = currentData[definition.type];

          const finalDef = {
            ...definition,
            category: definition.category || 'sensors',
            isCustom: true,
            imageUrl: imagePublicPath,
          };

          currentData[definition.type] = {
            definition: finalDef,
            imageUrl: imagePublicPath,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          };

          writeCustomComponentsJson(currentData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, definition: finalDef, imageUrl: imagePublicPath }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const typeId = parsedUrl.searchParams.get('type') || pathname.split('/').filter(Boolean).pop();
      if (!typeId || typeId === 'custom-components') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing type parameter' }));
        return;
      }

      const currentData = readCustomComponentsJson();
      if (currentData[typeId]) {
        delete currentData[typeId];
        writeCustomComponentsJson(currentData);
      }

      const safeId = typeId.replace(/[^a-zA-Z0-9_-]/g, '_');
      ['png', 'jpg', 'jpeg', 'webp', 'svg'].forEach((ext) => {
        const p = path.join(COMPONENTS_DIR, `${safeId}.${ext}`);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }

  // 2. Handle Backend API requests (auth, files, users)
  if (pathname.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }

  // 3. Static File Serving (dist / public)
  let localFilePath = path.join(DIST_DIR, pathname);

  if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).isDirectory()) {
    const publicCandidate = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(publicCandidate) && !fs.statSync(publicCandidate).isDirectory()) {
      localFilePath = publicCandidate;
    }
  }

  if (fs.existsSync(localFilePath) && !fs.statSync(localFilePath).isDirectory()) {
    const ext = path.extname(localFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(localFilePath).pipe(res);
    return;
  }

  // 4. SPA Fallback: index.html
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Wirecraft Frontend Build (dist/index.html) not found. Please run npm run build.');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ [Wirecraft Production Server] Running on http://0.0.0.0:${PORT}`);
});
