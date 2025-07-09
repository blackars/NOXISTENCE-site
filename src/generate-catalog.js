// Script para generar catalog.json automáticamente
const fs = require('fs');
const path = require('path');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const OUTPUT_FILE = path.join(__dirname, '../public/data/catalog.json');

// Asegurar que el directorio de salida existe
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Verificar si el directorio hojas existe
if (!fs.existsSync(HOJAS_DIR)) {
  console.log('Directorio hojas/ no encontrado, creando catalog.json vacío');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('catalog.json creado (vacío)');
  process.exit(0);
}

fs.readdir(HOJAS_DIR, (err, files) => {
  if (err) {
    console.error('Error leyendo la carpeta hojas/:', err);
    // En lugar de fallar, crear un catalog.json vacío
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf8');
    console.log('catalog.json creado (vacío) debido a error');
    process.exit(0);
  }
  
  // Filtrar solo archivos .json (ignorar .DS_Store, etc)
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonFiles, null, 2), 'utf8');
  console.log(`catalog.json generado con ${jsonFiles.length} archivos.`);
}); 