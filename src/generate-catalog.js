// Script para generar catalog.json y lore.json automáticamente
const fs = require('fs');
const path = require('path');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');
const OUTPUT_FILE = path.join(__dirname, '../public/data/catalog.json');
const OUTPUT_LORE_FILE = path.join(__dirname, '../public/data/lore.json');

// Generar catalog.json (colecciones)
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

// Generar lore.json (artículos de lore)
fs.readdir(LORE_DIR, (err, files) => {
  if (err) {
    if (err.code === 'ENOENT') {
      // La carpeta no existe, crear archivo vacío
      fs.writeFile(OUTPUT_LORE_FILE, JSON.stringify([], null, 2), 'utf8', (err2) => {
        if (err2) {
          console.error('Error escribiendo lore.json:', err2);
          process.exit(1);
        }
        console.log('lore.json generado vacío (no existe carpeta hojas/lore).');
      });
      return;
    } else {
      console.error('Error leyendo la carpeta hojas/lore/:', err);
      process.exit(1);
    }
  }
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  fs.writeFile(OUTPUT_LORE_FILE, JSON.stringify(jsonFiles, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error escribiendo lore.json:', err);
      process.exit(1);
    }
    console.log(`lore.json generado con ${jsonFiles.length} archivos.`);
  });
});