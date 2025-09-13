
// scripts/upload-fonts.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// node-fetch v3 is ESM-only; we support both v2 & v3
let fetchFn = require('node-fetch');
fetchFn = fetchFn.default || fetchFn; // soportar ambas versiones
const fetch = fetchFn;
const FormData = require('form-data');
const { Blob } = require('buffer');
const path = require('path');

// Configurar Cloudinary
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

const fontsDir = path.join(__dirname, '../public/fonts');
const outputJsonPath = path.join(__dirname, '../fonts-cloudinary.json');

// Helper: obtain signature from backend (same logic as editor.html)
async function getCloudinarySignature({ folder = 'uploads', public_id = undefined }) {
  const backendBase = process.env.BACKEND_BASE_URL || 'http://localhost:3100';
  const res = await fetch(`${backendBase}/api/cloudinary-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, public_id })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error obtaining signature: ${res.status} - ${err}`);
  }
  return await res.json();
}

// Helper: upload file to Cloudinary using params from backend (mirror of editor.html)
async function uploadToCloudinary(fileBuffer, fileName, folder = 'noxistence/fonts') {
  const public_id_raw = fileName.replace(/\.[^/.]+$/, '');
  const public_id = public_id_raw.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  const params = await getCloudinarySignature({ folder, public_id });
  // Build form data just with expected params
  const formData = new FormData();
  formData.append('file', fileBuffer, fileName);
  if (params.apiKey) formData.append('api_key', params.apiKey);
  if (params.timestamp) formData.append('timestamp', params.timestamp);
  if (params.signature) formData.append('signature', params.signature);
  if (params.folder) formData.append('folder', params.folder);
  if (params.public_id) formData.append('public_id', params.public_id);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/raw/upload`;
  const res = await fetch(uploadUrl, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${err}`);
  }
  return await res.json();
}

async function uploadFonts() {
  try {
    console.log('Buscando fuentes en:', fontsDir);
    const files = await fs.readdir(fontsDir);
    const fontFiles = files.filter(file => /\.(ttf|otf|woff|woff2)$/i.test(file));

    if (fontFiles.length === 0) {
      console.log('No se encontraron archivos de fuentes para subir.');
      return;
    }

    console.log(`Se encontraron ${fontFiles.length} fuentes. Subiendo a Cloudinary...`);

    const uploadedFonts = [];

    for (const fontFile of fontFiles) {
      const filePath = path.join(fontsDir, fontFile);
      const fileBuffer = await fs.readFile(filePath);
      try {
        const result = await uploadToCloudinary(fileBuffer, fontFile, 'noxistence/fonts');
        console.log(`Fuente subida: ${fontFile} -> ${result.secure_url}`);
        uploadedFonts.push({
          name: path.basename(fontFile, path.extname(fontFile)).replace(/_/g, ' '),
          url: result.secure_url,
        });
      } catch (error) {
        console.error(`Error al subir ${fontFile}:`, error);
      }
    }

    console.log('Fuentes subidas:', uploadedFonts);

    // Guardar el JSON localmente (opcional, para revisión)
    await fs.writeFile(outputJsonPath, JSON.stringify(uploadedFonts, null, 2));
    console.log(`JSON con URLs de Cloudinary guardado en: ${outputJsonPath}`);

    // Subir el archivo JSON a Cloudinary
    console.log('Subiendo fonts.json a Cloudinary...');
    const fileBufferJson = await fs.readFile(outputJsonPath);
    const resultJson = await uploadToCloudinary(fileBufferJson, 'fonts.json', 'noxistence/data');
    console.log(`fonts.json subido a Cloudinary: ${resultJson.secure_url}`);

    console.log('¡Proceso completado!');

  } catch (error) {
    console.error('Ocurrió un error en el proceso:', error);
  }
}

uploadFonts();
