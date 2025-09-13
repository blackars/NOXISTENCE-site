const fs = require('fs');
const path = require('path');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { uploadBufferToCloudinary } = require('../server/cloudinary');
const cloudinary = require('cloudinary').v2;

console.log('[GENERATE THUMBNAILS SCRIPT] Script loaded using @sparticuz/chromium.');

// Configuración de Cloudinary
if (!cloudinary.config().cloud_name) {
  require('dotenv').config();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const HOJAS_DIR = path.join(__dirname, '../dist/hojas');
const VIEWER_URL_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

function findJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) {
    console.warn(`[WARN] Directory not found, skipping: ${dir}`);
    return [];
  }
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJsonFiles(filePath));
    } else if (file.endsWith('.json')) {
      results.push(filePath);
    }
  });
  return results;
}

async function generateThumbnailForFile(absoluteFilePath) {
  const distDir = path.join(__dirname, '../dist');
  const fileRelativePath = path.relative(distDir, absoluteFilePath).replace(/\\/g, '/');
  const cloudinaryFolder = fileRelativePath.includes('hojas/lore/') ? 'noxistence/thumbnails/lore' : 'noxistence/thumbnails/collections';

  console.log(`[+] Iniciando miniatura para: ${fileRelativePath}`);
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    console.log(` -> Navegador iniciado para ${fileRelativePath}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

    const url = `${VIEWER_URL_BASE}/viewer.html?file=${encodeURIComponent(fileRelativePath)}`;
    console.log(` -> Navegando a: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('#grid', { visible: true, timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const buffer = await page.screenshot({ type: 'png', omitBackground: true });
    console.log(` -> Screenshot tomada (tamaño: ${buffer.length} bytes)`);

    const publicId = path.basename(fileRelativePath, '.json');
    const result = await uploadBufferToCloudinary(buffer, cloudinaryFolder, publicId);
    console.log(`[SUCCESS] Miniatura subida: ${result.secure_url}`);
    return result.secure_url;

  } catch (error) {
    console.error(`[ERROR] Fallo al procesar ${fileRelativePath}:`, error.message);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

async function generateAllThumbnails() {
  console.log('--- [START] Proceso de Generación de Todas las Miniaturas ---');
  const fullHojasDir = path.resolve(HOJAS_DIR);
  console.log(`[INFO] Directorio raíz a escanear: ${fullHojasDir}`);

  const allJsonFiles = findJsonFiles(fullHojasDir);

  if (allJsonFiles.length === 0) {
    console.warn('[WARN] No se encontraron archivos .json. Proceso finalizado.');
    return;
  }

  console.log(`[INFO] ${allJsonFiles.length} archivos .json encontrados. Iniciando procesamiento...`);
  
  // Procesar en serie para no sobrecargar el contenedor
  for (const filePath of allJsonFiles) {
    await generateThumbnailForFile(filePath);
  }

  console.log('--- [END] Proceso de Generación de Todas las Miniaturas Completado ---');
}

module.exports = { generateAllThumbnails };
