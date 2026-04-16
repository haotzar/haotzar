import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [react()],
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
    exclude: ['canvas', 'path2d-polyfill', '@tauri-apps/api'],
    include: ['react', 'react-dom', '@fluentui/react-components']
  },
  resolve: {
    alias: {
      canvas: false,
      'path2d-polyfill': false
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
