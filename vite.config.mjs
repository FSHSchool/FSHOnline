import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/FSHOnline/',
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  define: {
    // Override __dirname in case a dependency (likely SUSHI or GoFSH) tries to use it
    // see: https://main.vitejs.dev/config/shared-options.html#define
    __dirname: '""',
    // Override load variable -- for some reason, this variable is sometimes undefined when
    // running the built code.
    load: {}
  },
  plugins: [
    react(),
    nodePolyfills({
      include: [
        'child_process',
        'constants',
        'fs',
        'http',
        'https',
        'net',
        'os',
        'path',
        'stream',
        'tls',
        'util',
        'zlib'
      ]
    })
  ],
  resolve: {
    alias: {
      // fhir/fhir is only used by SUSHI to convert XML so we don't need this
      // and it takes up a lot of space in the production build
      'fhir/fhir': path.resolve('./src/stubs/fhir.js'),
      // avoid loading file system specific packages that we don't need
      'fs-extra': path.resolve('./src/stubs/empty.js'),
      'readline-sync': path.resolve('./src/stubs/empty.js'),
      tar: path.resolve('./src/stubs/empty.js')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'tests/setupTests.js'
  }
});
