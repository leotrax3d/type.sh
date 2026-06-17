import { defineConfig } from 'vite';

// Vanilla JavaScript project — no framework plugins required.
// `public/` is served at the site root, so snippet files are reachable at
// `/snippets/<file>` both in dev and in the production build.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
