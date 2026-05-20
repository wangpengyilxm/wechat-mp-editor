import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startAppServer } from '../server/appServer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

async function bootstrap(): Promise<void> {
  const staticRoot = getStaticRoot()
  const server = await startAppServer({ staticRoot, host: '127.0.0.1', port: 0 })
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
