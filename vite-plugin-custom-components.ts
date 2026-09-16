import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

export function customComponentsApiPlugin(): Plugin {
  return {
    name: 'wirecraft-custom-components-api',
    configureServer(server) {
      server.middlewares.use(handleCustomComponentsMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleCustomComponentsMiddleware);
    },
  };
}

function handleCustomComponentsMiddleware(
  req: Connect.IncomingMessage,
  res: any,
  next: Connect.NextFunction
) {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  if (!url.pathname.startsWith('/api/custom-components')) {
    return next();
  }

  const projectRoot = process.cwd();
  const publicDir = path.join(projectRoot, 'public');
  const componentsDir = path.join(publicDir, 'components');
  const customJsonDir = path.join(publicDir, 'custom-components');
  const customJsonFile = path.join(customJsonDir, 'components.json');

  if (!fs.existsSync(customJsonDir)) {
    fs.mkdirSync(customJsonDir, { recursive: true });
  }
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }
  if (!fs.existsSync(customJsonFile)) {
    fs.writeFileSync(customJsonFile, JSON.stringify({}, null, 2), 'utf-8');
  }

  const readJson = (): Record<string, any> => {
    try {
      const content = fs.readFileSync(customJsonFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  };

  const writeJson = (data: any) => {
    fs.writeFileSync(customJsonFile, JSON.stringify(data, null, 2), 'utf-8');
  };

  if (req.method === 'GET') {
    const data = readJson();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { definition, imageBase64 } = JSON.parse(body);
        if (!definition || !definition.type) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Invalid definition data' }));
          return;
        }

        const safeId = definition.type.replace(/[^a-zA-Z0-9_-]/g, '_');
        let imagePublicPath = definition.imageUrl || '';

        // If imageBase64 is provided, write binary file to disk permanently
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image')) {
          const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (matches) {
            const rawExt = matches[1].toLowerCase();
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
            const filename = `${safeId}.${ext}`;
            const filepath = path.join(componentsDir, filename);
            const buffer = Buffer.from(matches[2], 'base64');
            fs.writeFileSync(filepath, buffer);
            imagePublicPath = `/components/${filename}`;
          }
        }

        const now = new Date().toISOString();
        const currentData = readJson();
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

        writeJson(currentData);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, definition: finalDef, imageUrl: imagePublicPath }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE') {
    const typeId = url.searchParams.get('type') || url.pathname.split('/').filter(Boolean).pop();
    if (!typeId || typeId === 'custom-components') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Missing type parameter' }));
      return;
    }

    const currentData = readJson();
    if (currentData[typeId]) {
      delete currentData[typeId];
      writeJson(currentData);
    }

    const safeId = typeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    ['png', 'jpg', 'jpeg', 'webp', 'svg'].forEach((ext) => {
      const p = path.join(componentsDir, `${safeId}.${ext}`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  }

  next();
}
