import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to handle canvas imports in pdfjs-dist
const canvasPlugin = {
  name: 'canvas-stub',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source === 'canvas' || source === 'path2d-polyfill') {
      return '\0' + source; // Virtual module prefix
    }
    return null;
  },
  load(id) {
    if (id === '\0canvas') {
      return 'export default {}; export const Canvas = class {};';
    }
    if (id === '\0path2d-polyfill') {
      return 'export default {};';
    }
    return null;
  }
};

export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [canvasPlugin, react()],
  server: {
    open: false,
    strictPort: false,
    watch: {
      ignored: ['**/books/**', '**/node_modules/**', '**/resources/**', '**/index/**']
    },
    hmr: {
      overlay: false
    }
  },
  optimizeDeps: {
    exclude: ['canvas', 'path2d-polyfill', '@tauri-apps/api', 'pdfjs-dist'],
    include: ['react', 'react-dom', '@fluentui/react-components'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  resolve: {
    alias: {
      canvas: path.resolve(__dirname, 'src/stubs/canvas.js'),
      'path2d-polyfill': path.resolve(__dirname, 'src/stubs/path2d-polyfill.js')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        /^books\/.*/,
        /^resources\/.*/,
        /^index\/.*/
      ],
      output: {
        // שמור על מבנה התיקיות של pdfjs
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('pdfjs')) {
            return assetInfo.name;
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',
    target: 'esnext',
    assetsDir: 'assets',
    copyPublicDir: true
  },
  publicDir: 'public',
  assetsInclude: ['**/*.pdf', '**/*.txt', '**/*.png', '**/*.jpg', '**/*.ico'],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
