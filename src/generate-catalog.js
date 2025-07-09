// Script para generar catalog.json automáticamente
const fs = require('fs');
const path = require('path');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const OUTPUT_FILE = path.join(__dirname, '../public/data/catalog.json');

fs.readdir(HOJAS_DIR, (err, files) => {
  if (err) {
    console.error('Error leyendo la carpeta hojas/:', err);
    process.exit(1);
  }
  // Filtrar solo archivos .json (ignorar .DS_Store, etc)
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  fs.writeFile(OUTPUT_FILE, JSON.stringify(jsonFiles, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error escribiendo catalog.json:', err);
      process.exit(1);
    }
    console.log(`catalog.json generado con ${jsonFiles.length} archivos.`);
  });
}); 