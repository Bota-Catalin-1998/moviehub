import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['tests/**', 'node_modules/**'],
    coverage: {
      provider: 'v8'
    }
  }
})