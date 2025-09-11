
// scripts/upload-fonts.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
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
      const publicId = `fonts/${path.basename(fontFile, path.extname(fontFile))}`;

      try {
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: 'raw',
          public_id: publicId,
          overwrite: true,
        });
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
    const jsonUploadResult = await cloudinary.uploader.upload(outputJsonPath, {
        resource_type: 'raw',
        public_id: 'data/fonts.json',
        overwrite: true,
        format: 'json'
    });
    console.log(`fonts.json subido a Cloudinary: ${jsonUploadResult.secure_url}`);

    console.log('¡Proceso completado!');

  } catch (error) {
    console.error('Ocurrió un error en el proceso:', error);
  }
}

uploadFonts();
