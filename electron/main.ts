import { app, BrowserWindow, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startAppServer } from '../server/appServer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_SERVER_PORT = 19527
const SERVER_PORT_FILE = 'server-port.json'

let mainWindow: BrowserWindow | null = null
let closeServer: (() => Promise<void>) | null = null

function getStaticRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist')
  }
  return path.join(__dirname, '..', 'dist')
}

async function createMainWindow(appUrl: string): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: '公众号智能助手',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // 固定持久化分区，保证 localStorage 在多次启动间保留
      partition: 'persist:wechat-mp-editor',
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  await mainWindow.loadURL(appUrl)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function resolveServerPort(): number {
  const portFile = path.join(app.getPath('userData'), SERVER_PORT_FILE)
  try {
    if (fs.existsSync(portFile)) {
      const data = JSON.parse(fs.readFileSync(portFile, 'utf8')) as { port?: number }
      if (typeof data.port === 'number' && data.port > 0 && data.port < 65536) {
        return data.port
      }
    }
  } catch {
    // ignore corrupt file
  }
  try {
    fs.mkdirSync(path.dirname(portFile), { recursive: true })
    fs.writeFileSync(portFile, JSON.stringify({ port: DEFAULT_SERVER_PORT }), 'utf8')
  } catch {
    // ignore write errors; still use default port
  }
  return DEFAULT_SERVER_PORT
}

async function bootstrap(): Promise<void> {
  const staticRoot = getStaticRoot()
  const port = resolveServerPort()
  const server = await startAppServer({ staticRoot, host: '127.0.0.1', port })
  closeServer = server.close
  await createMainWindow(server.url)
}

app.whenReady().then(() => {
  void bootstrap()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void closeServer?.()
})

app.on('activate', () => {
  if (mainWindow === null && closeServer) {
    void bootstrap()
  }
})
