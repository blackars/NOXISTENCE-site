const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { uploadBufferToCloudinary } = require('../server/cloudinary');
const cloudinary = require('cloudinary').v2; // Import cloudinary for config

// Asegurarse de que Cloudinary esté configurado (debería estar en server.js, pero es bueno tenerlo aquí también si se ejecuta de forma independiente)
if (!cloudinary.config().cloud_name) {
  require('dotenv').config(); // Cargar .env si no está cargado
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');

// URL base configurable para viewer.html
// Usa una variable de entorno, por defecto localhost:3000 para desarrollo
const VIEWER_URL_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

// Función para esperar a que todas las imágenes se carguen
async function waitForImages(page) {
  return page.evaluate(async () => {
    const selectors = Array.from(document.querySelectorAll('img'));
    
    await Promise.all(selectors.map(img => {
      if (img.complete) return;
      return new Promise((resolve, reject) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', () => {
          console.error(`Error loading image: ${img.src}`);
          resolve(); // Continuar aunque falle alguna imagen
        });
      });
    }));
  });
}

async function generateThumbnailForFile(fileRelativePath, cloudinaryFolder) {
  console.log(`[DEBUG] generateThumbnailForFile: Iniciando para ${fileRelativePath} en ${cloudinaryFolder}`);
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ] 
  });
  console.log(`[DEBUG] generateThumbnailForFile: Puppeteer lanzado para ${fileRelativePath}`);
  
  const page = await browser.newPage();
  console.log(`[DEBUG] generateThumbnailForFile: Nueva página creada para ${fileRelativePath}`);
  
  try {
    await page.setViewport({ 
      width: 1600, 
      height: 900,
      deviceScaleFactor: 1
    });
    console.log(`[DEBUG] generateThumbnailForFile: Viewport configurado para ${fileRelativePath}`);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    console.log(`[DEBUG] generateThumbnailForFile: Intercepción de peticiones configurada para ${fileRelativePath}`);
    
    // Construir la URL completa para viewer.html
    const url = `${VIEWER_URL_BASE}/viewer.html?file=${encodeURIComponent(fileRelativePath)}`;
    console.log(`[DEBUG] generateThumbnailForFile: Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 120000
    });
    console.log(`[DEBUG] generateThumbnailForFile: page.goto completado para ${fileRelativePath}`);
    
    console.log(`[DEBUG] generateThumbnailForFile: Esperando a que el grid esté visible para ${fileRelativePath}...`);
    await page.waitForSelector('#grid', { 
      visible: true, 
      timeout: 30000 
    });
    console.log(`[DEBUG] generateThumbnailForFile: Grid visible para ${fileRelativePath}.`);
    
    console.log(`[DEBUG] generateThumbnailForFile: Esperando a que las imágenes se carguen para ${fileRelativePath}...`);
    await waitForImages(page);
    console.log(`[DEBUG] generateThumbnailForFile: Imágenes cargadas para ${fileRelativePath}.`);
    
    console.log(`[DEBUG] generateThumbnailForFile: Esperando renderizado adicional para ${fileRelativePath}...`);
    await new Promise(r => setTimeout(r, 3000));
    console.log(`[DEBUG] generateThumbnailForFile: Renderizado adicional completado para ${fileRelativePath}.`);

    // Tomar screenshot en un buffer
    console.log(`[DEBUG] generateThumbnailForFile: Tomando screenshot para ${fileRelativePath}...`);
    const buffer = await page.screenshot({ 
      type: 'png',
      omitBackground: true,
      fullPage: true
    });
    console.log(`[DEBUG] generateThumbnailForFile: Screenshot tomado para ${fileRelativePath}. Tamaño del buffer: ${buffer.length} bytes.`);

    // Subir el buffer a Cloudinary
    const publicId = path.basename(fileRelativePath, '.json');
    console.log(`[DEBUG] generateThumbnailForFile: Subiendo miniatura a Cloudinary: ${cloudinaryFolder}/${publicId}`);
    
    const result = await uploadBufferToCloudinary(buffer, cloudinaryFolder, publicId);
    
    console.log(`[DEBUG] generateThumbnailForFile: Miniatura subida exitosamente a Cloudinary para ${fileRelativePath}:`, result.secure_url);
    return result.secure_url;
    
  } catch (error) {
    console.error(`[DEBUG ERROR] Error al generar y subir la miniatura para ${fileRelativePath}:`, error);
    throw error;
  } finally {
    console.log(`[DEBUG] generateThumbnailForFile: Cerrando navegador para ${fileRelativePath}.`);
    await browser.close();
  }
}

async function generateAllThumbnailsCollections() {
  console.log('[DEBUG] generateAllThumbnailsCollections: Iniciando proceso de colecciones.');
  if (!fs.existsSync(HOJAS_DIR)) {
      console.log('No existe la carpeta /public/hojas, no se generan miniaturas de colecciones.');
      return;
  }
  const files = fs.readdirSync(HOJAS_DIR).filter(f => f.endsWith('.json'));
  console.log(`[DEBUG] generateAllThumbnailsCollections: ${files.length} archivos JSON encontrados en ${HOJAS_DIR}.`);
  for (const file of files) {
    try {
      console.log('[DEBUG] [collections] Procesando miniatura para', file);
      // Pasar la ruta relativa desde public/
      await generateThumbnailForFile(`hojas/${file}`, 'noxistence/thumbnails/collections');
    } catch (e) {
      console.error('[DEBUG ERROR] Error con la miniatura de colección', file, e);
    }
  }
  console.log('[DEBUG] Proceso de miniaturas de colecciones completado.');
}

async function generateAllThumbnailsLore() {
  console.log('[DEBUG] generateAllThumbnailsLore: Iniciando proceso de lore.');
  if (!fs.existsSync(LORE_DIR)) {
    console.log('No existe la carpeta /public/hojas/lore, no se generan miniaturas de lore.');
    return;
  }
  const files = fs.readdirSync(LORE_DIR).filter(f => f.endsWith('.json'));
  console.log(`[DEBUG] generateAllThumbnailsLore: ${files.length} archivos JSON encontrados en ${LORE_DIR}.`);
  for (const file of files) {
    try {
      console.log('[DEBUG] [lore] Procesando miniatura para', file);
      // Pasar la ruta relativa desde public/
      await generateThumbnailForFile(`hojas/lore/${file}`, 'noxistence/thumbnails/lore');
    } catch (e) {
      console.error('[DEBUG ERROR] Error con la miniatura de lore', file, e);
    }
  }
  console.log('[DEBUG] Proceso de miniaturas de lore completado.');
}

if (require.main === module) {
  console.log('[DEBUG] generate-thumbnails.js ejecutado directamente. Iniciando generación de todas las miniaturas.');
  generateAllThumbnailsCollections().then(() => generateAllThumbnailsLore());
}

// Exportar para usar desde el backend
module.exports = {
  generateAllThumbnailsCollections,
  generateAllThumbnailsLore,
  generateThumbnailForFile,
};