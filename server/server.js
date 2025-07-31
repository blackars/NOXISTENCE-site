require('dotenv').config(); // Al inicio del archivo

// Generar catalog.json automáticamente al iniciar el servidor
require('../src/generate-catalog');

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const app = express();
const port = 3100;

// Importar rutas de lore
const loreRouter = require('./routes/lore');

// Montar rutas de la API
app.use('/api/lore', loreRouter);

// Configuración CORS para desarrollo
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'El origen de la petición no está permitido por CORS';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Manejar preflight para todas las rutas
app.options('*', cors(corsOptions));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // Configurar headers para archivos específicos si es necesario
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Middleware para parsear JSON y datos de formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para parsear multipart/form-data (usando multer)
// Esto se manejará en las rutas específicas que lo necesiten
const fontsRoutes = require('../src/fonts');
const { generateAllThumbnails } = require('../src/generate-thumbnails');
const cloudinary = require('cloudinary').v2;

// Verificar variables de entorno de Cloudinary
console.log('Configurando Cloudinary con las siguientes credenciales:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '*** Configurado ***' : 'No configurado');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '*** Configurado ***' : 'No configurado');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '*** Configurado ***' : 'No configurado');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Faltan credenciales de Cloudinary en las variables de entorno');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Función auxiliar para limpiar tags de criaturas
function cleanCreaturesTags(creatures) {
  return creatures.map(creature => {
    // Eliminar completamente el campo tags si existe
    if (creature.hasOwnProperty('tags')) {
      const { tags, ...creatureWithoutTags } = creature;
      return creatureWithoutTags;
    }
    return creature;
  });
}

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/img/');
  },
  filename: function (req, file, cb) {
    // Generar nombre único basado en timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

// Configurar multer para subir imágenes de arte
const artStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/imgart/');
  },
  filename: function (req, file, cb) {
    // Generar nombre único basado en timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

const uploadArt = multer({ 
  storage: artStorage,
  fileFilter: function (req, file, cb) {
    // Solo permitir imágenes (PNG, SVG, JPG, etc.)
    if (file.mimetype.startsWith('image/') || file.originalname.toLowerCase().endsWith('.svg')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (PNG, SVG, JPG, etc.)'), false);
    }
  }
});

// Configurar multer para subir imágenes de lore
const loreStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/lore';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadLore = multer({ 
  storage: loreStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Proteger el acceso a /editor.html antes de servir archivos estáticos
app.get('/editor.html', basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Editor Area'
}), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/editor.html'));
});

// Servir archivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Proteger el acceso a rutas sensibles (pero ya no /editor.html)
app.use(['public/fonts', 'public/hojas', 'public/imageart'], basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Editor Area'
}));

// Ruta para subir imágenes
app.post('/upload', (req, res) => {
  try {
    console.log('Datos recibidos en /upload:', {
      body: req.body,
      headers: req.headers
    });
    
    console.log('Solicitud recibida para /upload');
    console.log('Datos recibidos:', req.body);

    // Validar que el cuerpo de la solicitud sea JSON
    if (!req.body) {
      console.log('Error: No se recibieron datos en el cuerpo de la solicitud');
      return res.status(400).json({ error: 'No se recibieron datos en el cuerpo de la solicitud' });
    }

    const creature = req.body;
    if (!creature || !creature.name || !creature.img) {
      console.log('Error: Datos de criatura inválidos');
      return res.status(400).json({ error: 'Datos de criatura inválidos' });
    }

    // Leer el JSON actual
    const jsonPath = path.join(__dirname, '../public/data/creatures.json');
    
    // Asegurarse de que el directorio exista
    const dirPath = path.dirname(jsonPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    let creatures = [];
    try {
      if (fs.existsSync(jsonPath)) {
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        creatures = JSON.parse(jsonData);
        console.log('Criaturas leídas del archivo:', creatures.length);
        // Limpiar tags existentes de criaturas anteriores
        creatures = cleanCreaturesTags(creatures);
      } else {
        console.log('Creando nuevo archivo creatures.json');
      }
    } catch (error) {
      console.log('Creando nuevo archivo creatures.json');
    }

    // Crear nuevo entry
    const newCreature = {
      id: creature.id || `creature_${Date.now()}`,
      name: creature.name,
      world: creature.world || 'Default',
      img: creature.img
    };

    // Agregar al array
    creatures.push(newCreature);
    console.log('Nueva criatura agregada:', newCreature);

    // Escribir de vuelta al archivo
    try {
      const creaturesJson = JSON.stringify(creatures, null, 2);
      console.log('Contenido a escribir:', creaturesJson);
      fs.writeFileSync(jsonPath, creaturesJson);
      console.log('Archivo creatures.json actualizado exitosamente');
    } catch (error) {
      console.error('Error al escribir creatures.json:', error);
      throw error; // Propagar el error para que se capture en el catch principal
    }

    // Responder con JSON
    const response = {
      success: true,
      creature: newCreature,
      creatures: creatures
    };
    console.log('Respondiendo con:', response);
    res.json(response);

  } catch (error) {
    console.error('Error al subir criatura:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para subir imágenes de arte
app.post('/upload-art', uploadArt.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const imagePath = `imgart/${req.file.filename}`;
    const imageName = req.file.originalname.replace(/\.[^/.]+$/, '');

    console.log('Imagen de arte subida:', {
      name: imageName,
      path: imagePath,
      originalName: req.file.originalname
    });

    res.json({
      success: true,
      art: {
        id: `art_${Date.now()}`,
        name: imageName,
        img: imagePath,
        originalName: req.file.originalname
      },
      message: 'Imagen de arte subida correctamente'
    });

  } catch (error) {
    console.error('Error al procesar la subida de arte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener todas las criaturas
app.get('/creatures', (req, res) => {
  try {
    const jsonPath = 'public/data/creatures.json';
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const creatures = JSON.parse(jsonData);
    // Limpiar tags existentes de criaturas anteriores
    const cleanCreatures = cleanCreaturesTags(creatures);
    
    // Guardar el archivo limpio de vuelta al disco
    fs.writeFileSync(jsonPath, JSON.stringify(cleanCreatures, null, 2));
    
    res.json(cleanCreatures);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer el archivo JSON' });
  }
});

// Ruta para obtener todas las imágenes de arte
app.get('/art', (req, res) => {
  try {
    const artDir = 'public/imgart/';
    const artFiles = [];
    
    if (fs.existsSync(artDir)) {
      const files = fs.readdirSync(artDir);
      
      files.forEach(file => {
        if (file.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
          artFiles.push({
            id: `art_${file.replace(/\.[^/.]+$/, '')}`,
            name: file.replace(/\.[^/.]+$/, ''),
            img: `imgart/${file}`,
            originalName: file
          });
        }
      });
    }
    
    res.json(artFiles);
  } catch (error) {
    console.error('Error al leer imágenes de arte:', error);
    res.status(500).json({ error: 'Error al leer las imágenes de arte' });
  }
});

// Ruta para eliminar una criatura
app.delete('/creatures/:id', (req, res) => {
  try {
    const creatureId = req.params.id;
    const jsonPath = 'public/data/creatures.json';
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    let creatures = JSON.parse(jsonData);

    // Limpiar tags existentes de criaturas anteriores
    creatures = cleanCreaturesTags(creatures);

    // Guardar el archivo limpio inmediatamente
    fs.writeFileSync(jsonPath, JSON.stringify(creatures, null, 2));

    // Encontrar y eliminar la criatura
    const creatureIndex = creatures.findIndex(c => c.id === creatureId);
    if (creatureIndex === -1) {
      return res.status(404).json({ error: 'Criatura no encontrada' });
    }

    const creature = creatures[creatureIndex];
    
    console.log('Eliminando criatura:', creature);
    
    // Eliminar el archivo de imagen
    if (fs.existsSync(creature.img)) {
      console.log('Eliminando archivo de imagen:', creature.img);
      fs.unlinkSync(creature.img);
    } else {
      console.log('Archivo de imagen no encontrado:', creature.img);
    }

    // Eliminar del array
    creatures.splice(creatureIndex, 1);

    // Escribir de vuelta al archivo
    fs.writeFileSync(jsonPath, JSON.stringify(creatures, null, 2));

    res.json({ success: true, message: 'Criatura eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para eliminar una imagen de arte
app.delete('/art/:id', (req, res) => {
  try {
    const artId = req.params.id;
    const artDir = 'imgart/';
    
    if (fs.existsSync(artDir)) {
      const files = fs.readdirSync(artDir);
      
      for (const file of files) {
        const fileId = `art_${file.replace(/\.[^/.]+$/, '')}`;
        
        if (fileId === artId) {
          const filePath = `${artDir}${file}`;
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Imagen de arte eliminada:', filePath);
            
            return res.json({ 
              success: true, 
              message: 'Imagen de arte eliminada correctamente' 
            });
          }
        }
      }
    }
    
    res.status(404).json({ error: 'Imagen de arte no encontrada' });

  } catch (error) {
    console.error('Error al eliminar imagen de arte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para listar archivos .json en /hojas
app.get('/hojas-list', (req, res) => {
  const hojasDir = path.join(__dirname, '../public/hojas');
  try {
    if (!fs.existsSync(hojasDir)) return res.json([]);
    const files = fs.readdirSync(hojasDir)
      .filter(f => f.endsWith('.json'));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Error al leer la carpeta de hojas' });
  }
});

// Endpoint protegido para generar miniaturas de todas las colecciones
app.post('/admin/generate-thumbnails', basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Admin Area'
}), async (req, res) => {
  try {
    await generateAllThumbnails();
    res.json({ success: true, message: 'Miniaturas generadas correctamente.' });
  } catch (error) {
    console.error('Error al generar miniaturas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para obtener firma de subida segura
// Ruta para obtener recursos de Cloudinary
app.get('/cloudinary-resources', async (req, res) => {
  console.log('Solicitud recibida en /cloudinary-resources');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  try {
    const { folder } = req.query;
    
    if (!folder) {
      console.log('Error: No se proporcionó el parámetro folder');
      return res.status(400).json({ error: 'Se requiere el parámetro folder' });
    }

    console.log(`Solicitando recursos de Cloudinary para la carpeta: ${folder}`);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${folder}/`,  // Asegurarse de que la carpeta termine con /
      max_results: 500,
      context: true,
      tags: true
    });

    console.log(`Recursos encontrados en Cloudinary (${folder}):`, result.resources ? result.resources.length : 0);
    
    if (!result.resources || result.resources.length === 0) {
      console.log('No se encontraron recursos. Verifica que la carpeta exista y tenga contenido.');
      console.log('Intenta verificar en el dashboard de Cloudinary si la carpeta y las imágenes existen.');
      return res.status(404).json({ 
        error: 'No se encontraron recursos',
        folder: folder,
        resources: []
      });
    }
    
    // Devolver los recursos encontrados
    return res.json({
      success: true,
      folder: folder,
      resources: result.resources,
      total: result.resources.length
    });

    res.json(result);
  } catch (error) {
    console.error('Error al obtener recursos de Cloudinary:', error);
    console.error('Detalles completos del error:', {
      message: error.message,
      name: error.name,
      status: error.http_code,
      headers: error.http_headers,
      request_id: error.request_id
    });
    
    res.status(500).json({ 
      error: 'Error al obtener recursos de Cloudinary', 
      message: error.message,
      details: {
        name: error.name,
        status: error.http_code,
        folder: req.query.folder,
        request_id: error.request_id
      }
    });
  }
});

app.post('/cloudinary-signature', (req, res) => {
  const { folder, resource_type, public_id } = req.body;
  const timestamp = Math.round((new Date).getTime() / 1000);

  // Solo incluir en la firma los parámetros que realmente se enviarán a Cloudinary
  const paramsToSign = {
    folder: folder || 'uploads',
    timestamp
  };
  if (public_id) paramsToSign.public_id = public_id;
  // resource_type no se incluye en la firma, solo en la URL final

  // LOGS DE DEPURACIÓN DETALLADOS Y PRUEBA DEFINITIVA
  console.log('--- /cloudinary-signature ---');
  console.log('Body recibido:', req.body);
  console.log('Parámetros a firmar:', paramsToSign);
  const stringToSign = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  console.log('String to sign:', stringToSign);
  // Imprimir variables de entorno relevantes
  console.log('CLOUDINARY_CLOUD_NAME (.env):', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('CLOUDINARY_API_KEY (.env):', process.env.CLOUDINARY_API_KEY);
  console.log('CLOUDINARY_API_SECRET (.env):', process.env.CLOUDINARY_API_SECRET);
  // Imprimir config de cloudinary
  const config = cloudinary.config();
  console.log('cloudinary.config():', config);
  // Imprimir api_secret usado para firmar
  const apiSecretUsed = config.api_secret;
  console.log('api_secret usado para firmar:', apiSecretUsed);
  // Imprimir timestamp y hora UTC
  console.log('timestamp usado:', paramsToSign.timestamp);
  console.log('timestamp UTC:', new Date(paramsToSign.timestamp * 1000).toISOString());
  // Generar y mostrar la firma
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecretUsed);
  console.log('Signature generada:', signature);
  console.log('----------------------------');

  // Devolver todos los parámetros que el frontend debe enviar tal cual
  // Usar el public_id proporcionado o undefined para que Cloudinary genere uno aleatorio
  res.json({
    signature,
    timestamp,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
    folder: paramsToSign.folder,
    resource_type: resource_type || 'auto',
    public_id: public_id // Usar el public_id proporcionado o undefined
  });
});

// Endpoint para generar firmas de Cloudinary
app.post('/cloudinary-signature', (req, res) => {
  try {
    const { folder = 'uploads', resource_type = 'auto', public_id } = req.body;
    const timestamp = Math.round((new Date).getTime() / 1000);

    console.log('Solicitando firma para:', { folder, resource_type, public_id });

    // Solo incluir en la firma los parámetros que realmente se enviarán a Cloudinary
    const params = {
      timestamp,
      folder: folder,
      resource_type: resource_type
    };

    // Solo agregar public_id si se proporciona
    if (public_id) {
      params.public_id = public_id;
    }

    // Generar la firma
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    
    // Devolver los datos necesarios para la carga directa
    const response = {
      signature,
      timestamp,
      folder: params.folder,
      resource_type: params.resource_type,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      ...(public_id && { public_id })
    };

    console.log('Firma generada correctamente');
    res.json(response);
  } catch (error) {
    console.error('Error al generar la firma de Cloudinary:', error);
    res.status(500).json({
      error: 'Error al generar la firma',
      message: error.message,
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

app.use('/', fontsRoutes);

// Usar rutas de lore
app.use('/api/lore', uploadLore.single('thumbnail'), loreRouter);

generateAllThumbnails(); // Esto generará las miniaturas al iniciar el servidor

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
  
  // Crear directorio para lore si no existe
  const loreDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(loreDir)) {
    fs.mkdirSync(loreDir, { recursive: true });
  }
  
  // Crear archivo lore.json si no existe
  const loreFile = path.join(loreDir, 'lore.json');
  if (!fs.existsSync(loreFile)) {
    fs.writeFileSync(loreFile, JSON.stringify({ articles: [] }, null, 2));
  }
  
  console.log('Editor disponible en: http://localhost:3000/editor.html');
  console.log('Catálogo disponible en: http://localhost:3000/catalog.html');
});