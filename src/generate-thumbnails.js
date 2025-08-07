const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');
const THUMBNAILS_COLLECTIONS_DIR = path.join(__dirname, '../public/thumbnails/ss-collections');
const THUMBNAILS_LORE_DIR = path.join(__dirname, '../public/thumbnails/ss-lore');
const VIEWER_URL_BASE = 'http://localhost:3000/viewer.html?file='; // Ajusta el puerto si es diferente
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

async function generateThumbnailForFile(file, outputDir, outputFilename = null) {
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
    // Configurar el viewport
    await page.setViewport({ 
      width: 1600, 
      height: 900,
      deviceScaleFactor: 1
    });
    
    // Habilitar request interception para manejar peticiones de recursos
    await page.setRequestInterception(true);
    
    // Manejar peticiones para evitar cargar recursos innecesarios
    page.on('request', (request) => {
      // Bloquear ciertos tipos de recursos que no son necesarios para las miniaturas
      const resourceType = request.resourceType();
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navegar a la página
    const url = VIEWER_URL_BASE + encodeURIComponent(file);
    console.log(`Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 120000 // Aumentar el timeout a 2 minutos
    });
    
    // Esperar a que el grid esté visible
    console.log('Esperando a que el grid esté visible...');
    await page.waitForSelector('#grid', { 
      visible: true, 
      timeout: 30000 
    });
    
    // Esperar a que todas las imágenes se carguen
    console.log('Esperando a que las imágenes se carguen...');
    await waitForImages(page);
    
    // Esperar un poco más para asegurar que todo esté renderizado
    console.log('Esperando renderizado adicional...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Crear el directorio de salida si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Tomar el screenshot
    const thumbPath = path.join(outputDir, (outputFilename || file).replace(/\.json$/, '.png'));
    console.log(`Guardando miniatura en: ${thumbPath}`);
    
    // Tomar screenshot de toda la página
    await page.screenshot({ 
      path: thumbPath, 
      fullPage: true,
      type: 'png',
      omitBackground: true
    });
    
    console.log('Miniatura generada exitosamente');
    
  } catch (error) {
    console.error('Error al generar la miniatura:', error);
    throw error; // Relanzar el error para manejarlo en el llamador
  } finally {
    // Cerrar el navegador
    await browser.close();
  }
  return thumbPath;
}

async function generateAllThumbnailsCollections() {
  if (!fs.existsSync(THUMBNAILS_COLLECTIONS_DIR)) fs.mkdirSync(THUMBNAILS_COLLECTIONS_DIR, { recursive: true });
  const files = fs.readdirSync(HOJAS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      console.log('[collections] Generando miniatura para', file);
      await generateThumbnailForFile(file, THUMBNAILS_COLLECTIONS_DIR);
    } catch (e) {
      console.error('Error con', file, e);
    }
  }
  console.log('Miniaturas de colecciones generadas.');
}

async function generateAllThumbnailsLore() {
  if (!fs.existsSync(THUMBNAILS_LORE_DIR)) fs.mkdirSync(THUMBNAILS_LORE_DIR, { recursive: true });
  if (!fs.existsSync(LORE_DIR)) {
    console.log('No existe la carpeta hojas/lore, no se generan miniaturas de lore.');
    return;
  }
  const files = fs.readdirSync(LORE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      console.log('[lore] Generando miniatura para', file);
      // Remove 'lore/' from the output filename
      const outputFilename = file.replace(/^lore\//, '');
      await generateThumbnailForFile('lore/' + file, THUMBNAILS_LORE_DIR, outputFilename);
    } catch (e) {
      console.error('Error con', file, e);
    }
  }
  console.log('Miniaturas de lore generadas.');
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