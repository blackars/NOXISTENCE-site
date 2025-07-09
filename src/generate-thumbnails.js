const fs = require('fs');
const path = require('path');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const THUMBNAILS_DIR = path.join(__dirname, '../public/thumbnails');

// Función simplificada que solo crea el directorio de thumbnails
function setupThumbnailsDirectory() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    console.log('Directorio thumbnails/ creado');
  }
  
  // Crear archivo placeholder si no existe
  const placeholderPath = path.join(THUMBNAILS_DIR, 'placeholder.png');
  if (!fs.existsSync(placeholderPath)) {
    console.log('Archivo placeholder.png no encontrado, se creará manualmente');
  }
  
  console.log('Configuración de thumbnails completada');
}

// Función para generar thumbnails (simplificada para build)
function generateAllThumbnails() {
  setupThumbnailsDirectory();
  
  if (!fs.existsSync(HOJAS_DIR)) {
    console.log('Directorio hojas/ no encontrado, saltando generación de thumbnails');
    return;
  }
  
  const files = fs.readdirSync(HOJAS_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No se encontraron archivos JSON para generar thumbnails');
    return;
  }
  
  // Si solo hay el archivo de ejemplo, saltar la generación de thumbnails
  if (files.length === 1 && files[0] === 'example.json') {
    console.log('Solo se encontró el archivo de ejemplo, saltando generación de thumbnails');
    return;
  }
  
  console.log(`Encontrados ${files.length} archivos JSON. Los thumbnails se generarán dinámicamente.`);
}

if (require.main === module) {
  generateAllThumbnails();
}

// Exportar para usar desde el backend
module.exports = { generateAllThumbnails, setupThumbnailsDirectory }; 