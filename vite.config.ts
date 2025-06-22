import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // This will disable the React DevTools overlay
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            runtime: 'automatic'
          }, 'react-refresh'],
        ],
      },
    }),
  ],
}) 