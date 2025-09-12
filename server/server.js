require('dotenv').config(); // Al inicio del archivo
process.env.FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';


const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3100;

// Configuración CORS flexible para producción y desarrollo
const corsOptions = {
  origin: 'https://noxistence-site-867269891625.us-central1.run.app', // URL del frontend hardcodeada
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  console.log('Request path:', req.path);
  next();
});

// Servir archivos estáticos desde la carpeta dist (build de Vite)
app.use(express.static(path.join(__dirname, '../dist')));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('[SERVER START] Attempting to require generate-thumbnails.js...');
const { generateAllThumbnails } = require('../src/generate-thumbnails'); // <-- MODIFICADO
console.log('[SERVER START] generate-thumbnails.js required successfully.');
const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Faltan credenciales de Cloudinary en las variables de entorno');
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configurar multer para usar memoria en lugar de disco
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

// Ruta para generar TODAS las miniaturas bajo demanda
app.post('/api/generate-all-thumbnails', async (req, res) => {
  console.log('[API] Solicitud para generar TODAS las miniaturas.');

  try {
    // Llama a la nueva función unificada
    await generateAllThumbnails();
    res.json({ success: true, message: 'Proceso de generación de miniaturas completado.' });
  } catch (error) {
    console.error('[API ERROR] Falló la generación masiva de miniaturas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al generar las miniaturas.' });
  }
});
const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Faltan credenciales de Cloudinary en las variables de entorno');
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});



// --- RUTAS DE API ---

// Ruta para listar fuentes desde public/fonts/fonts.json
app.get('/api/list-fonts', (req, res) => {
  try {
    const fontsJsonPath = path.join(__dirname, '../public/fonts/fonts.json');
    if (fs.existsSync(fontsJsonPath)) {
      const jsonData = fs.readFileSync(fontsJsonPath, 'utf8');
      res.json(JSON.parse(jsonData));
    } else {
      res.json([]); // Return empty array if file doesn't exist
    }
  } catch (error) {
    console.error('Error al listar fuentes:', error);
    res.status(500).json({ error: 'Error al listar fuentes' });
  }
});

// Ruta para generar la firma de Cloudinary para subidas directas desde el frontend
app.post('/api/cloudinary-signature', (req, res) => {
  let { folder, resource_type, public_id } = req.body;
  const timestamp = Math.round((new Date).getTime() / 1000);

  // Sanitize public_id: remove non-alphanumeric characters, convert to lowercase
  if (public_id) {
    public_id = public_id.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  }

  const params = {
    timestamp: timestamp,
    folder: folder,
    // resource_type: resource_type, // Removed from signature params
  };
  if (public_id) {
    params.public_id = public_id;
  }

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  res.json({
    signature: signature,
    timestamp: timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: folder,
    resource_type: resource_type, // Still include in response if needed by client
    public_id: public_id // Incluir public_id si se proporcionó
  });
});


// Ruta para listar recursos de Cloudinary por carpeta
app.get('/api/list-assets', async (req, res) => {
  try {
    const folder = req.query.folder || ''; // Obtener la carpeta de los parámetros de consulta
    const resourceType = req.query.resource_type || 'image'; // 'image', 'video', 'raw', etc.

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder ? `${folder}/` : '', // Añadir '/' al final del prefijo si hay carpeta
      resource_type: resourceType,
      max_results: 500 // Puedes ajustar esto o implementar paginación
    });

    console.log(`[DEBUG] Cloudinary response for folder "${folder}":`, JSON.stringify(result, null, 2));
    res.setHeader('Cache-Control', 'no-store').json({ success: true, assets: result.resources });
  } catch (error) {
    console.error('Error al listar recursos de Cloudinary:', error);
    res.status(500).json({ error: 'Error al listar recursos de Cloudinary' });
  }
});

// Ruta para listar archivos JSON en hojas/collections/ 
app.get('/api/hojas-list-collections', (req, res) => {
  try {
    const hojasPath = path.join(__dirname, '../dist/hojas/collections'); // Path to the copied 'hojas/collections' directory
    if (!fs.existsSync(hojasPath)) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    const files = fs.readdirSync(hojasPath)
      .filter(file => file.endsWith('.json'))
      .map(file => file); // Just return the filename
    res.json(files);
  } catch (error) {
    console.error('Error al listar colecciones:', error);
    res.status(500).json({ error: 'Error al listar colecciones' });
  }
});

// Ruta para listar archivos JSON en hojas/lore/
app.get('/api/hojas-list-lore', (req, res) => {
  try {
    const hojasLorePath = path.join(__dirname, '../dist/hojas/lore'); // Path to the copied 'hojas/lore' directory
    if (!fs.existsSync(hojasLorePath)) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    const files = fs.readdirSync(hojasLorePath)
      .filter(file => file.endsWith('.json'))
      .map(file => file); // Just return the filename
    res.json(files);
  } catch (error) {
    console.error('Error al listar artículos de lore:', error);
    res.status(500).json({ error: 'Error al listar artículos de lore' });
  }
});

// Ruta para subir imágenes de arte directamente a Cloudinary
app.post('/api/upload-art', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const upload_stream = cloudinary.uploader.upload_stream(
    {
      folder: "art_uploads", // Carpeta en Cloudinary
      resource_type: 'auto'
    },
    (error, result) => {
      if (error) {
        console.error('Error al subir a Cloudinary:', error);
        return res.status(500).json({ error: 'Error al subir la imagen a Cloudinary' });
      }
      
      // Responder con la información de Cloudinary
      res.json({
        success: true,
        art: {
          id: result.public_id, // Usar el public_id de Cloudinary como ID
          name: result.original_filename,
          img: result.secure_url, // URL segura de la imagen
          originalName: req.file.originalname
        },
        message: 'Imagen de arte subida correctamente a Cloudinary'
      });
    }
  );

  // Escribir el buffer del archivo en el stream de subida de Cloudinary
  upload_stream.end(req.file.buffer);
});


// Ruta para subir imágenes de arte directamente a Cloudinary
app.post('/api/upload-art', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const upload_stream = cloudinary.uploader.upload_stream(
    {
      folder: "art_uploads", // Carpeta en Cloudinary
      resource_type: 'auto'
    },
    (error, result) => {
      if (error) {
        console.error('Error al subir a Cloudinary:', error);
        return res.status(500).json({ error: 'Error al subir la imagen a Cloudinary' });
      }
      
      // Responder con la información de Cloudinary
      res.json({
        success: true,
        art: {
          id: result.public_id, // Usar el public_id de Cloudinary como ID
          name: result.original_filename,
          img: result.secure_url, // URL segura de la imagen
          originalName: req.file.originalname
        },
        message: 'Imagen de arte subida correctamente a Cloudinary'
      });
    }
  );

  // Escribir el buffer del archivo en el stream de subida de Cloudinary
  upload_stream.end(req.file.buffer);
});

// Ruta para eliminar una imagen de arte de Cloudinary
app.delete('/api/art/:id', async (req, res) => {
  try {
    const publicId = req.params.id;
    if (!publicId) {
        return res.status(400).json({ error: 'Se requiere el ID público del recurso' });
    }

    // Usar el SDK de Cloudinary para eliminar el recurso
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
        res.json({ success: true, message: 'Imagen de arte eliminada correctamente de Cloudinary' });
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

async function processCreatureQueue() {
  if (isProcessingCreatures || creatureQueue.length === 0) {
    return;
  }
  isProcessingCreatures = true;
  const { creatureData, res } = creatureQueue.shift();

  try {
    const creaturesPublicId = 'data/creatures.json';
    let creatures = [];

    try {
      const existingDataUrl = cloudinary.url(creaturesPublicId, { resource_type: 'raw', secure: true });
      const response = await fetch(existingDataUrl, { cache: 'no-store' });
      if (response.ok) {
        const existingJson = await response.json();
        if (Array.isArray(existingJson)) {
          creatures = existingJson;
        }
      } else if (response.status !== 404) {
        throw new Error(`Error reading existing file from Cloudinary: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Could not read ${creaturesPublicId} from Cloudinary, will create a new one. Error: ${error.message}`);
    }

    creatures.push(creatureData);

    const jsonString = JSON.stringify(creatures, null, 2);
    
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: creaturesPublicId,
          resource_type: 'raw',
          overwrite: true,
          invalidate: true // Added to try and bust Cloudinary's cache
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(jsonString);
    });

    res.json({
      success: true,
      message: 'Creature data uploaded successfully to Cloudinary',
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url
    });

  } catch (error) {
    console.error('Error in /api/upload route:', error);
    res.status(500).json({ error: 'Internal server error while uploading creature data.' });
  } finally {
    isProcessingCreatures = false;
    processCreatureQueue();
  }
}

app.post('/api/upload', (req, res) => {
  const creatureData = req.body;
  if (!creatureData || Object.keys(creatureData).length === 0) {
    return res.status(400).json({ error: 'No creature data provided.' });
  }
  
  creatureQueue.push({ creatureData, res });
  processCreatureQueue();
});

// Ruta para obtener todas las criaturas (lee de Cloudinary)
app.get('/api/creatures', async (req, res) => {
  await readJsonFromCloudinary('data/creatures.json', res);
});

// Helper function to read JSON from Cloudinary
async function readJsonFromCloudinary(publicId, res) {
  try {
    const dataUrl = cloudinary.url(publicId, { resource_type: 'raw', secure: true });
    const response = await fetch(dataUrl, { cache: 'no-store' });

    if (response.ok) {
      const data = await response.json();
      res.setHeader('Cache-Control', 'no-store').json(data);
    } else if (response.status === 404) {
      res.setHeader('Cache-Control', 'no-store').json([]); // Return empty array if file not found
    } else {
      throw new Error(`Error al leer ${publicId} de Cloudinary: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error al leer ${publicId} de Cloudinary:`, error);
    res.status(500).json({ error: `Error al leer ${publicId} de Cloudinary` });
  }
}

// Ruta para obtener datos de lore (lee de Cloudinary)
app.get('/api/data/lore', async (req, res) => {
  await readJsonFromCloudinary('data/lore.json', res);
});

// Ruta para obtener datos de catálogo (lee de Cloudinary)
app.get('/api/data/catalog', async (req, res) => {
  await readJsonFromCloudinary('data/catalog.json', res);
});

// Ruta para obtener datos de fuentes (lee de Cloudinary)
app.get('/api/data/fonts', async (req, res) => {
  await readJsonFromCloudinary('data/fonts.json', res);
});


// Proteger el acceso a /editor.html
app.get('/editor.html', basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Editor Area'
}), (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/editor.html'));
});


// Generate thumbnails on server start
console.log('[SERVER START] Calling generateAllThumbnailsCollections()...');
generateAllThumbnailsCollections()
  .then(() => generateAllThumbnailsLore())
  .catch(err => console.error('Error generating thumbnails:', err));

// Fallback para SPA: servir index.html para cualquier otra ruta no encontrada
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
