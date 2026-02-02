require('dotenv').config();
process.env.FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 3100;

// Configuración CORS
const corsOptions = {
  origin: 'https://noxistence-site-867269891625.us-central1.run.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Log requests
app.use((req, res, next) => {
  console.log(`Request path: ${req.path}`);
  next();
});

// Servir archivos estáticos desde dist
app.use(express.static(path.join(__dirname, '../dist')));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Cloudinary (una sola vez)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Faltan credenciales de Cloudinary en las variables de entorno');
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configuración de Multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// --- RUTAS DE API ---

// Endpoint para generar miniaturas bajo demanda
// Ruta para generar TODAS las miniaturas bajo demanda (de forma asíncrona)
app.post('/api/generate-all-thumbnails', (req, res) => {
  console.log('[API] Solicitud para generar TODAS las miniaturas.');

  // **CARGA DIFERIDA**: El require se hace aquí para no retrasar el arranque del servidor.
  const { generateAllThumbnails } = require('../dist/js/generate-thumbnails');

  // Llama a la función pero NO la espera con await.
  // Esto libera el request de inmediato.
  generateAllThumbnails().catch(err => {
    // Loguear cualquier error no capturado del proceso en segundo plano
    console.error('[BACKGROUND ERROR] Falló la generación masiva de miniaturas:', err);
  });

  // Responder inmediatamente al cliente para no causar un timeout.
  res.status(202).json({ 
    success: true, 
    message: 'El proceso de generación de miniaturas ha comenzado en segundo plano. Revisa los logs del servidor para ver el progreso.' 
  });
});

// Endpoint para listar fuentes
app.get('/api/list-fonts', (req, res) => {
  try {
    const fontsJsonPath = path.join(__dirname, '../public/fonts/fonts.json');
    let debug = {
      ruta: fontsJsonPath,
      existe: fs.existsSync(fontsJsonPath),
      contenido: null,
      error: null
    };
    if (debug.existe) {
      try {
        const jsonData = fs.readFileSync(fontsJsonPath, 'utf8');
        debug.contenido = jsonData;
        let parsed = [];
        try {
          parsed = JSON.parse(jsonData);
        } catch (e) {
          debug.error = 'JSON.parse error: ' + e.message;
        }
        res.json({ fonts: parsed, debug });
      } catch (e) {
        debug.error = 'readFileSync error: ' + e.message;
        res.json({ fonts: [], debug });
      }
    } else {
      res.json({ fonts: [], debug });
    }
  } catch (error) {
    console.error('Error al listar fuentes:', error);
    res.status(500).json({ error: 'Error al listar fuentes', debug: { error: error.message } });
  }
});

// Endpoint para la firma de subida a Cloudinary
app.post('/api/cloudinary-signature', (req, res) => {
  let { folder, resource_type, public_id } = req.body;
  const timestamp = Math.round((new Date).getTime() / 1000);
  if (public_id) {
    public_id = public_id.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  }
  const params = { timestamp, folder };
  if (public_id) {
    params.public_id = public_id;
  }
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  res.json({ signature, timestamp, cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, folder, resource_type, public_id });
});

// Endpoint para listar assets de Cloudinary
app.get('/api/list-assets', async (req, res) => {
  try {
    const { folder = '', resource_type = 'image' } = req.query;
    const result = await cloudinary.api.resources({ type: 'upload', prefix: folder ? `${folder}/` : '', resource_type, max_results: 500 });
    res.setHeader('Cache-Control', 'no-store').json({ success: true, assets: result.resources });
  } catch (error) {
    console.error('Error al listar recursos de Cloudinary:', error);
    res.status(500).json({ error: 'Error al listar recursos de Cloudinary' });
  }
});

// Endpoint para listar solo colecciones
app.get('/api/hojas-list-collections', (req, res) => {
  try {
    const collectionsPath = path.join(__dirname, '../dist/hojas/collections');
    if (!fs.existsSync(collectionsPath)) {
      return res.json([]);
    }
    const files = fs.readdirSync(collectionsPath).filter(file => file.endsWith('.json'));
    res.json(files);
  } catch (error) {
    console.error('Error al listar colecciones:', error);
    res.status(500).json({ error: 'Error al listar colecciones' });
  }
});

// Endpoint para listar solo lore
app.get('/api/hojas-list-lore', (req, res) => {
  try {
    const lorePath = path.join(__dirname, '../dist/hojas/lore');
    if (!fs.existsSync(lorePath)) {
      return res.json([]);
    }
    const files = fs.readdirSync(lorePath).filter(file => file.endsWith('.json'));
    res.json(files);
  } catch (error) {
    console.error('Error al listar lore:', error);
    res.status(500).json({ error: 'Error al listar lore' });
  }
});

// Endpoint para listar TODAS las hojas (recursivo) para "enlazar capas"
app.get('/api/hojas-list', (req, res) => {
  const hojasDir = path.join(__dirname, '../dist/hojas');
  
  function findJsonFilesRecursive(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        results = results.concat(findJsonFilesRecursive(filePath));
      } else if (file.endsWith('.json')) {
        results.push(filePath);
      }
    });
    return results;
  }

  try {
    const allFiles = findJsonFilesRecursive(hojasDir);
    const relativeFiles = allFiles.map(file => path.relative(hojasDir, file).replace(/\\/g, '/'));
    res.json({ hojas: relativeFiles });
  } catch (error) {
    console.error('Error al listar todas las hojas:', error);
    res.status(500).json({ error: 'Error al listar las hojas' });
  }
});


// Endpoint para subir arte
app.post('/api/upload-art', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  const upload_stream = cloudinary.uploader.upload_stream({ folder: "art_uploads", resource_type: 'auto' }, (error, result) => {
    if (error) {
      console.error('Error al subir a Cloudinary:', error);
      return res.status(500).json({ error: 'Error al subir la imagen a Cloudinary' });
    }
    res.json({ success: true, art: { id: result.public_id, name: result.original_filename, img: result.secure_url, originalName: req.file.originalname }, message: 'Imagen de arte subida correctamente' });
  });
  upload_stream.end(req.file.buffer);
});

// Endpoint para eliminar arte
app.delete('/api/art/:id', async (req, res) => {
  try {
    const publicId = req.params.id;
    if (!publicId) return res.status(400).json({ error: 'Se requiere el ID público del recurso' });
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok' || result.result === 'not found') {
      res.json({ success: true, message: 'Imagen de arte eliminada correctamente' });
    } else {
      console.error('Error al eliminar de Cloudinary:', result);
      res.status(500).json({ error: 'No se pudo eliminar la imagen de Cloudinary' });
    }
  } catch (error) {
    console.error('Error al eliminar imagen de arte:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar la imagen' });
  }
});

// --- Concurrency control for creatures.json ---
let isProcessingCreatures = false;
const creatureQueue = [];
function addCacheBuster(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cb=${Date.now()}`;
}
async function processCreatureQueue() {
  if (isProcessingCreatures || creatureQueue.length === 0) return;
  isProcessingCreatures = true;
  const { creatureData, res } = creatureQueue.shift();
  try {
    const creaturesFolder = 'noxistence/data';
    const creaturesPublicId = 'creatures';
    let creatures = [];
    try {
      const existingDataUrl = addCacheBuster(
        cloudinary.url(`${creaturesFolder}/${creaturesPublicId}.json`, { resource_type: 'raw', secure: true })
      );
      const response = await fetch(existingDataUrl, { cache: 'no-store' });
      if (response.ok) {
        creatures = await response.json();
      }
    } catch (e) { /* Ignorar si no existe */ }
    creatures.push(creatureData);
    const jsonString = JSON.stringify(creatures, null, 2);
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: creaturesFolder, public_id: creaturesPublicId, resource_type: 'raw', format: 'json', overwrite: true, invalidate: true }, (error, result) => error ? reject(error) : resolve(result));
      uploadStream.end(jsonString);
    });
    res.json({ success: true, message: 'Creature data uploaded', public_id: uploadResult.public_id, url: uploadResult.secure_url });
  } catch (error) {
    console.error('Error in /api/upload route:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    isProcessingCreatures = false;
    processCreatureQueue();
  }
}
app.post('/api/upload', (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ error: 'No creature data provided.' });
  creatureQueue.push({ creatureData: req.body, res });
  processCreatureQueue();
});

// Rutas para leer datos JSON desde Cloudinary
const readJsonFromCloudinary = async (publicId, res) => {
  try {
    const dataUrl = addCacheBuster(cloudinary.url(publicId, { resource_type: 'raw', secure: true }));
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (response.ok) {
      res.setHeader('Cache-Control', 'no-store').json(await response.json());
    } else {
      res.setHeader('Cache-Control', 'no-store').json([]);
    }
  } catch (error) {
    console.error(`Error al leer ${publicId} de Cloudinary:`, error);
    res.status(500).json({ error: `Error al leer ${publicId}` });
  }
};
app.get('/api/creatures', (req, res) => readJsonFromCloudinary('noxistence/data/creatures.json', res));
app.get('/api/data/lore', (req, res) => readJsonFromCloudinary('noxistence/data/lore.json', res));
app.get('/api/data/catalog', (req, res) => readJsonFromCloudinary('noxistence/data/catalog.json', res));
app.get('/api/data/fonts', (req, res) => readJsonFromCloudinary('noxistence/data/fonts.json', res));

// --- NUEVO: generar customfonts.json con listado de fuentes y subirlo ---
app.post('/api/update-fonts-json', async (req, res) => {
  try {
    const prefixes = ['noxistence/fonts', 'fonts'];
    let fontAssets = [];
    for (const prefix of prefixes) {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: prefix + '/',
        resource_type: 'raw',
        max_results: 500
      });
      if (Array.isArray(result.resources)) {
        fontAssets = fontAssets.concat(result.resources);
      }
    }
    if (!fontAssets.length) {
      return res.status(404).json({ success: false, message: 'No font assets found' });
    }

    const fontsArr = fontAssets.map(a => ({
      name: a.public_id.split('/').pop(),
      url: a.secure_url
    }));

    const jsonString = JSON.stringify(fontsArr, null, 2);

    await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'noxistence/data',
        public_id: 'customfonts',
        resource_type: 'raw',
        format: 'json',
        overwrite: true,
        invalidate: true
      }, (error, result) => error ? reject(error) : resolve(result));
      uploadStream.end(jsonString);
    });

    res.json({ success: true, count: fontsArr.length, fonts: fontsArr });
  } catch (error) {
    console.error('Error generating customfonts.json:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para verificar credenciales de autenticación
app.post('/api/verify-auth', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Verificar que se proporcionaron las credenciales
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }
    
    // Verificar credenciales contra las variables de entorno
    const validUser = process.env.EDITOR_USER;
    const validPass = process.env.EDITOR_PASS;
    
    if (!validUser || !validPass) {
      console.error('ERROR: Variables de entorno EDITOR_USER y EDITOR_PASS no configuradas');
      return res.status(500).json({ 
        success: false, 
        message: 'Error de configuración del servidor' 
      });
    }
    
    // Comparar credenciales
    if (username === validUser && password === validPass) {
      res.json({ 
        success: true, 
        message: 'Autenticación exitosa',
        username: username
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
  } catch (error) {
    console.error('Error en verificación de autenticación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Proteger el acceso a /editor.html
app.get('/editor.html', basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Editor Area'
}), (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/editor.html'));
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});