import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Explicitly exclude backend files from frontend build
    rollupOptions: {
      external: [
        'fs', 'path', 'pg', 'redis', 'mqtt', 'express', 
        'dotenv', 'express-session', 'cors'
      ]
    }
  },
  // Define global constants for browser environment
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  // Resolve conditions for browser
  resolve: {
    conditions: ['browser', 'module', 'import']
  }
})