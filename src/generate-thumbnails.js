const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const THUMBNAILS_DIR = path.join(__dirname, '../public/thumbnails');

// URL base para generar thumbnails - se puede configurar con variable de entorno
const VIEWER_URL_BASE = process.env.VIEWER_URL_BASE || 'https://your-site.netlify.app/viewer.html?file=';
const VIEWPORT_SIZE = 400; // Debe coincidir con el tamaño de miniatura

async function generateThumbnailForFile(file) {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const url = VIEWER_URL_BASE + encodeURIComponent(file);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#grid', { visible: true, timeout: 60000 });
    await new Promise(r => setTimeout(r, 800));
    // Screenshot de toda la página
    const thumbPath = path.join(THUMBNAILS_DIR, file.replace(/\.json$/, '.png'));
    await page.screenshot({ path: thumbPath, fullPage: true });
    console.log(`Thumbnail generado: ${thumbPath}`);
  } catch (error) {
    console.error(`Error generando thumbnail para ${file}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function generateAllThumbnails() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
  
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
  
  console.log(`Generando ${files.length} thumbnails...`);
  
  for (const file of files) {
    // Saltar el archivo de ejemplo
    if (file === 'example.json') {
      console.log('Saltando archivo de ejemplo:', file);
      continue;
    }
    
    try {
      console.log('Generando miniatura para', file);
      await generateThumbnailForFile(file);
    } catch (e) {
      console.error('Error con', file, e);
    }
  }
  console.log('Miniaturas generadas.');
}

if (require.main === module) {
  generateAllThumbnails();
}

// Exportar para usar desde el backend
module.exports = { generateAllThumbnails, generateThumbnailForFile }; 