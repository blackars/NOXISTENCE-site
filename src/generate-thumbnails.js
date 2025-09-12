console.log('[GENERATE THUMBNAILS SCRIPT] Script loaded.');

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { uploadBufferToCloudinary } = require('../server/cloudinary');
const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary (si no está ya configurado)
if (!cloudinary.config().cloud_name) {
  require('dotenv').config();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// --- RUTA CORRECTA ---
// Apuntar a la carpeta 'dist' que es la que usa el servidor en producción.
const HOJAS_DIR = path.join(__dirname, '../dist/hojas');

const VIEWER_URL_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

// Función recursiva para encontrar todos los archivos .json en un directorio
function findJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) {
    console.warn(`[WARN] El directorio no existe, se omite: ${dir}`);
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
  // Convertir el path absoluto a un path relativo desde la carpeta 'dist' para la URL
  const distDir = path.join(__dirname, '../dist');
  const fileRelativePath = path.relative(distDir, absoluteFilePath).replace(/\\/g, '/');

  // Determinar la carpeta de Cloudinary
  const cloudinaryFolder = fileRelativePath.includes('hojas/lore/')
    ? 'noxistence/thumbnails/lore'
    : 'noxistence/thumbnails/collections';

  console.log(`[+] Iniciando miniatura para: ${fileRelativePath}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });
  } catch (e) {
    console.error(`[ERROR] Fallo al iniciar Puppeteer para ${fileRelativePath}:`, e);
    throw e;
  }

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

    const url = `${VIEWER_URL_BASE}/viewer.html?file=${encodeURIComponent(fileRelativePath)}`;
    console.log(` -> Navegando a: ${url}`);

    await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 120000 });
    await page.waitForSelector('#grid', { visible: true, timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000)); // Espera extra para renderizado

    const buffer = await page.screenshot({ type: 'png', omitBackground: true, fullPage: true });
    console.log(` -> Screenshot tomada (tamaño: ${buffer.length} bytes)`);

    const publicId = path.basename(fileRelativePath, '.json');
    const result = await uploadBufferToCloudinary(buffer, cloudinaryFolder, publicId);
    console.log(`[SUCCESS] Miniatura subida a Cloudinary: ${result.secure_url}`);
    return result.secure_url;

  } catch (error) {
    console.error(`[ERROR] Fallo al procesar ${fileRelativePath}:`, error.message);
    // No relanzar el error para no detener el proceso masivo
  } finally {
    await browser.close();
  }
}

// --- FUNCIÓN UNIFICADA ---
// Genera todas las miniaturas de forma recursiva
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
  
  for (const filePath of allJsonFiles) {
    try {
      await generateThumbnailForFile(filePath);
    } catch (e) {
      // El error ya se loguea dentro de generateThumbnailForFile
      console.error(`[FATAL] Error irrecuperable en el bucle principal para ${filePath}. Saltando al siguiente.`);
    }
  }

  console.log('--- [END] Proceso de Generación de Todas las Miniaturas Completado ---');
}

// Exportar para usar desde el backend
module.exports = {
  generateAllThumbnails,
  // Mantengo la exportación individual por si se necesita en el futuro
  generateThumbnailForFile: (relativePath) => generateThumbnailForFile(path.join(__dirname, '../dist', relativePath))
};