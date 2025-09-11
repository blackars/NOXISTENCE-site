// Script para generar y subir catalog.json y lore.json
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('cloudinary').v2;

// --- Cloudinary Config ---
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Faltan credenciales de Cloudinary en las variables de entorno. Asegúrate de que CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, y CLOUDINARY_API_SECRET están en tu archivo .env');
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const HOJAS_DIR = path.join(__dirname, '../public/hojas');
const LORE_DIR = path.join(__dirname, '../public/hojas/lore');
const OUTPUT_CATALOG_FILE = path.join(__dirname, '../public/data/catalog.json');
const OUTPUT_LORE_FILE = path.join(__dirname, '../public/data/lore.json');

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (filePath, publicId) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw',
      public_id: publicId,
      overwrite: true,
      format: 'json'
    });
    console.log(`Archivo subido a Cloudinary: ${result.secure_url}`);
  } catch (error) {
    console.error(`Error al subir ${filePath} a Cloudinary:`, error);
  }
};

async function generateAndUpload() {
  // --- Generar catalog.json ---
  try {
    const files = await fs.readdir(HOJAS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    await fs.writeFile(OUTPUT_CATALOG_FILE, JSON.stringify(jsonFiles, null, 2), 'utf8');
    console.log(`catalog.json generado con ${jsonFiles.length} archivos.`);
    // Upload
    await uploadToCloudinary(OUTPUT_CATALOG_FILE, 'data/catalog.json');
  } catch (err) {
    console.error('Error procesando catalog.json:', err);
  }

  // --- Generar lore.json ---
  try {
    const files = await fs.readdir(LORE_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    await fs.writeFile(OUTPUT_LORE_FILE, JSON.stringify(jsonFiles, null, 2), 'utf8');
    console.log(`lore.json generado con ${jsonFiles.length} archivos.`);
    // Upload
    await uploadToCloudinary(OUTPUT_LORE_FILE, 'data/lore.json');
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        await fs.writeFile(OUTPUT_LORE_FILE, JSON.stringify([], null, 2), 'utf8');
        console.log('lore.json generado vacío (no existe carpeta hojas/lore).');
        // Upload empty file
        await uploadToCloudinary(OUTPUT_LORE_FILE, 'data/lore.json');
      } catch (writeErr) {
        console.error('Error escribiendo lore.json vacío:', writeErr);
      }
    } else {
      console.error('Error procesando lore.json:', err);
    }
  }
}

generateAndUpload();
