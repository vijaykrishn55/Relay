import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the warning threshold — Mermaid diagram bundles are intentionally large
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Split Mermaid's heavy diagram definitions into separate lazy chunks
        manualChunks(id) {
          if (id.includes('mermaid') && id.includes('mindmap')) return 'mermaid-mindmap'
          if (id.includes('mermaid') && id.includes('flowchart-elk')) return 'mermaid-elk'
          if (id.includes('mermaid')) return 'mermaid-core'
          if (id.includes('node_modules/katex')) return 'katex'
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/react')) return 'react-vendor'
        }
      }
    }
  }
})
