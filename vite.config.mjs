import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy'; // <-- Importa el plugin

export default defineConfig({
  root: 'public',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // copyPublicDir: true, // <-- Esta línea ya no sería necesaria
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        catalog: resolve(__dirname, 'public/catalog.html'),
        collections: resolve(__dirname, 'public/collections.html'),
        editor: resolve(__dirname, 'public/editor.html'),
        lore: resolve(__dirname, 'public/lore.html'),
        viewer: resolve(__dirname, 'public/viewer.html'),
        404: resolve(__dirname, 'public/404.html'),
        footer: resolve(__dirname, 'public/footer.html'),
      }
    }
  },
  plugins: [ // <-- Añade la sección de plugins
    viteStaticCopy({
      targets: [
        {
          src: 'hojas/**/*', // Ruta de origen relativa a `root` (public/hojas)
          dest: 'hojas' // Ruta de destino relativa a `outDir` (dist/hojas)
        },
        { 
          src: 'js/edit-tools.js', // Ruta de origen relativa a `root` (public/js/edit-tools.js)
          dest: 'js' // Ruta de destino relativa a `outDir` (dist/js)
        }
      ]
    })
  ],
  server: {
    open: '/index.html',
    port: 3000,
    proxy: {
      '/cloudinary-signature': 'http://localhost:3100',
      '/api': 'http://localhost:3100'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
