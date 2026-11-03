import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  build: { outDir: path.resolve(__dirname, 'out/renderer'), emptyOutDir: true, chunkSizeWarningLimit: 6000 },
  resolve: { alias: { '@shared': path.resolve(__dirname, 'src/shared'), '@design': path.resolve(__dirname, '../../replica/design') } },
  server: { fs: { allow: ['../..'] } },
});
