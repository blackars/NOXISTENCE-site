const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();


// Cloudinary config
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });


// Endpoint para subir fuentes a Cloudinary
router.post('/fonts', upload.array('fonts'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No se subieron archivos' });
    }

    // Subir cada fuente a Cloudinary usando Promises
    function uploadFontToCloudinary(file) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'raw',
          folder: 'fonts',
          public_id: file.originalname.replace(/\.[^/.]+$/, '')
        }, (error, result) => {
          if (error) reject(error);
          else resolve({
            name: file.originalname,
            url: result.secure_url
          });
        });
        stream.end(file.buffer);
      });
    }

    const fontFiles = await Promise.all(req.files.map(uploadFontToCloudinary));

    // Guardar el listado en fonts/fonts.json (solo nombres y urls)
    const fontsJsonPath = path.join(__dirname, '../public/fonts/fonts.json');
    let allFonts = [];
    if (fs.existsSync(fontsJsonPath)) {
      try {
        allFonts = JSON.parse(fs.readFileSync(fontsJsonPath, 'utf8'));
      } catch {}
    }
    // Agregar o actualizar fuentes subidas
    fontFiles.forEach(font => {
      const idx = allFonts.findIndex(f => f.name === font.name);
      if (idx !== -1) allFonts[idx] = font;
      else allFonts.push(font);
    });
    fs.writeFileSync(fontsJsonPath, JSON.stringify(allFonts, null, 2));

    res.json({ success: true, files: fontFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;