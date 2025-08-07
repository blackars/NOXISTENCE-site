const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');
const THUMBNAILS_COLLECTIONS_DIR = path.join(__dirname, '../public/thumbnails/ss-collections');
const THUMBNAILS_LORE_DIR = path.join(__dirname, '../public/thumbnails/ss-lore');
const VIEWER_URL_BASE = 'http://localhost:3000/viewer.html?file='; // Ajusta el puerto si es diferente
const VIEWPORT_SIZE = 400; // Debe coincidir con el tamaño de miniatura

async function generateThumbnailForFile(file, outputDir, outputFilename = null) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const url = VIEWER_URL_BASE + encodeURIComponent(file);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#grid', { visible: true, timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));
  // Screenshot de toda la página
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const thumbPath = path.join(outputDir, (outputFilename || file).replace(/\.json$/, '.png'));
  await page.screenshot({ path: thumbPath, fullPage: true });
  await browser.close();
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