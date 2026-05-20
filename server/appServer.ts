import http from 'node:http'
import { handleHttpRequest } from './httpHandler'

export type AppServerOptions = {
  staticRoot: string
  host?: string
  port?: number
}

export function startAppServer(options: AppServerOptions): Promise<{
  url: string
  close: () => Promise<void>
}> {
  const host = options.host ?? '127.0.0.1'
  const staticRoot = options.staticRoot

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      void handleHttpRequest(req, res, staticRoot).catch((err) => {
        res.statusCode = 500
        res.end(err instanceof Error ? err.message : 'Server error')
      })
    })

    server.on('error', reject)

    server.listen(options.port ?? 0, host, () => {
      const addr = server.address()
      const port =
        typeof addr === 'object' && addr && 'port' in addr ? addr.port : options.port ?? 19527
      resolve({
        url: `http://${host}:${port}`,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()))
          }),
      })
    })
  })
}
