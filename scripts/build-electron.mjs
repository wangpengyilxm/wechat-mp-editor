import * as esbuild from 'esbuild'
import { mkdir } from 'node:fs/promises'

await mkdir('electron-dist', { recursive: true })

await esbuild.build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'electron-dist/main.mjs',
  external: ['electron'],
  packages: 'bundle',
})

console.log('Electron main bundled -> electron-dist/main.mjs')
