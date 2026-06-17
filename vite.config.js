import { defineConfig } from 'vite';

// On GitHub Actions the repo is served under /type.sh/ (project pages).
// Locally (dev + preview) we stay at /.
const base = process.env.GITHUB_ACTIONS ? '/type.sh/' : '/';

export default defineConfig({
  base,
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
