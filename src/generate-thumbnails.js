const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const THUMBNAILS_DIR = path.join(__dirname, '../public/thumbnails');
const VIEWER_URL_BASE = 'http://localhost:3000/viewer.html?file='; // AjustSa el puerto si es diferente
const VIEWPORT_SIZE = 400; // Debe coincidir con el tamaño de miniatura

async function generateThumbnailForFile(file) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const url = VIEWER_URL_BASE + encodeURIComponent(file);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#grid', { visible: true, timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));
  // Screenshot de toda la página
  const thumbPath = path.join(THUMBNAILS_DIR, file.replace(/\.json$/, '.png'));
  await page.screenshot({ path: thumbPath, fullPage: true });
  await browser.close();
  return thumbPath;
}

async function generateAllThumbnails() {
  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR);
  const files = fs.readdirSync(HOJAS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
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