import type { Plugin, Connect } from 'vite';
import { handleApiRequest } from './server/apiHandler.ts';

export function backendApiPlugin(): Plugin {
  return {
    name: 'wirecraft-backend-api',
    configureServer(server) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) => {
        const handled = await handleApiRequest(req, res);
        if (!handled) {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) => {
        const handled = await handleApiRequest(req, res);
        if (!handled) {
          next();
        }
      });
    },
  };
}
