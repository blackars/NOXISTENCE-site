const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configuración de Multer para guardar en /fonts
const fontsDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fontsDir);
  },
  filename: function (req, file, cb) {
    // Evitar sobrescribir fuentes con el mismo nombre
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Endpoint para subir fuentes
router.post('/fonts', upload.array('fonts'), (req, res) => {
  try {
    // Leer todos los archivos de la carpeta fonts
    const fontFiles = fs.readdirSync(fontsDir)
      .filter(f => /\.(ttf|otf|woff2?|TTF|OTF|WOFF2?|woff)$/i.test(f));
    // Guardar el listado en fonts/fonts.json
    fs.writeFileSync(
      path.join(fontsDir, 'fonts.json'),
      JSON.stringify(fontFiles, null, 2)
    );
    res.json({ success: true, files: fontFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;