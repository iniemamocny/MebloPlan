import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ base: process.env.GITHUB_ACTIONS ? '/MebloPlan/' : '/',
  plugins:[react()],
  resolve:{ dedupe:['react','react-dom'] },
  server:{ host:true },
  build:{ outDir:'dist', assetsDir:'assets' }
})
