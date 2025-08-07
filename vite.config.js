import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html')
    }
  },
  server: {
    open: '/public/index.html',
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