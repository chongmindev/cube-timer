import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Keep cubing's code out of the app bundle. Its scramble worker imports from whatever chunk
        // holds that code, and loading the app bundle inside a worker crashes it.
        codeSplitting: {
          groups: [{ name: 'cubing', test: /node_modules[\\/]cubing/ }],
        },
      },
    },
  },
})
