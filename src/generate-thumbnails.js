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
      timeout: 90000, // 90 segundos de timeout para el arranque
    });
    console.log(` -> Navegador iniciado para ${fileRelativePath}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 }); // Viewport grande para no limitar el contenido

    // viewer.html espera una ruta sin el prefijo 'hojas/', ya que lo añade internamente.
    const pathForViewer = fileRelativePath.startsWith('hojas/') ? fileRelativePath.substring(6) : fileRelativePath;
    const url = `${VIEWER_URL_BASE}/viewer.html?file=${encodeURIComponent(pathForViewer)}`;
    console.log(` -> Navegando a: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('#grid', { visible: true, timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000)); // Espera extra para renderizado

    // Medir el contenido y recortar la captura a su tamaño exacto
    const clip = await page.evaluate(() => {
        const grid = document.getElementById('grid');
        if (!grid || !grid.firstElementChild) return null;
        const contentBox = grid.firstElementChild.getBoundingClientRect();
        return { x: contentBox.x, y: contentBox.y, width: contentBox.width, height: contentBox.height };
    });

    let buffer;
    if (!clip || clip.width === 0 || clip.height === 0) {
        console.warn(` -> No se pudo medir el contenido, se usará el viewport completo.`);
        buffer = await page.screenshot({ type: 'png', omitBackground: true });
    } else {
        console.log(` -> Recortando a las dimensiones del contenido: ${Math.round(clip.width)}x${Math.round(clip.height)}`);
        buffer = await page.screenshot({ type: 'png', omitBackground: true, clip });
    }
    
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