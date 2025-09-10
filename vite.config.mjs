import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        catalog: resolve(__dirname, 'public/catalog.html'),
        collections: resolve(__dirname, 'public/collections.html'),
        editor: resolve(__dirname, 'public/editor.html'),
        lore: resolve(__dirname, 'public/lore.html'),
        viewer: resolve(__dirname, 'public/viewer.html'),
        404: resolve(__dirname, 'public/404.html'),
      }
    }
  },
  server: {
    open: '/index.html',
    port: 3000, // o el puerto que uses para Vite
    proxy: {
      // Redirige todas las peticiones que empiecen con /cloudinary-signature a tu backend
      '/cloudinary-signature': 'http://localhost:3100',
      // Proxy para todas las rutas de API a Express
      '/api': 'http://localhost:3100'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});