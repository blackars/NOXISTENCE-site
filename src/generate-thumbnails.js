const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { uploadBufferToCloudinary } = require('../server/cloudinary');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');

const VIEWER_URL_BASE = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:3000/viewer.html?file=' 
  : 'http://localhost:3000/viewer.html?file='; // Mismo puerto pero ahora manejado por la variable de entorno
const VIEWPORT_SIZE = 400; // Debe coincidir con el tamaño de miniatura

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

async function generateThumbnailForFile(file, cloudinaryFolder) {
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
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ 
      width: 1600, 
      height: 900,
      deviceScaleFactor: 1
    });
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    const url = VIEWER_URL_BASE + encodeURIComponent(file);
    console.log(`Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 120000
    });
    
    console.log('Esperando a que el grid esté visible...');
    await page.waitForSelector('#grid', { 
      visible: true, 
      timeout: 30000 
    });
    
    console.log('Esperando a que las imágenes se carguen...');
    await waitForImages(page);
    
    console.log('Esperando renderizado adicional...');
    await new Promise(r => setTimeout(r, 3000));

    // Tomar screenshot en un buffer
    const buffer = await page.screenshot({ 
      type: 'png',
      omitBackground: true,
      fullPage: true
    });

    // Subir el buffer a Cloudinary
    const publicId = path.basename(file, '.json');
    console.log(`Subiendo miniatura a Cloudinary: ${cloudinaryFolder}/${publicId}`);
    
    const result = await uploadBufferToCloudinary(buffer, cloudinaryFolder, publicId);
    
    console.log('Miniatura subida exitosamente a Cloudinary:', result.secure_url);
    return result.secure_url;
    
  } catch (error) {
    console.error('Error al generar y subir la miniatura:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function generateAllThumbnailsCollections() {
  if (!fs.existsSync(HOJAS_DIR)) {
      console.log('No existe la carpeta /public/hojas, no se generan miniaturas de colecciones.');
      return;
  }
  const files = fs.readdirSync(HOJAS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      console.log('[collections] Procesando miniatura para', file);
      await generateThumbnailForFile(file, 'ss-collections');
    } catch (e) {
      console.error('Error con', file, e);
    }
  }
  console.log('Proceso de miniaturas de colecciones completado.');
}

async function generateAllThumbnailsLore() {
  if (!fs.existsSync(LORE_DIR)) {
    console.log('No existe la carpeta /public/hojas/lore, no se generan miniaturas de lore.');
    return;
  }
  const files = fs.readdirSync(LORE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      console.log('[lore] Procesando miniatura para', file);
      await generateThumbnailForFile('lore/' + file, 'ss-lore');
    } catch (e) {
      console.error('Error con', file, e);
    }
  }
  console.log('Proceso de miniaturas de lore completado.');
}

if (require.main === module) {
  generateAllThumbnailsCollections().then(() => generateAllThumbnailsLore());
}

// Exportar para usar desde el backend
module.exports = {
  generateAllThumbnailsCollections,
  generateAllThumbnailsLore,
  generateThumbnailForFile,
};