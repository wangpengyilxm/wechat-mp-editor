import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wechatApiPlugin } from './server/viteWechatPlugin'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), wechatApiPlugin()],
})
