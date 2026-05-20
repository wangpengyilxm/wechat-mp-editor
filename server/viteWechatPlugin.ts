import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleHttpRequest } from './httpHandler'

function attachApiMiddleware(
  middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void
  },
): void {
  middlewares.use((req, res, next) => {
    const url = req.url?.split('?')[0]
    const isApi =
      (req.method === 'GET' && url === '/api/image-proxy') ||
      (req.method === 'POST' && url === '/api/wechat/sync-draft')

    if (!isApi) {
      next()
      return
    }

    void handleHttpRequest(req, res).then(() => {
      if (!res.writableEnded) next()
    })
  })
}

export function wechatApiPlugin(): Plugin {
  return {
    name: 'wechat-mp-api',
    configureServer(server) {
      attachApiMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachApiMiddleware(server.middlewares)
    },
  }
}
