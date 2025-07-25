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

// Configuración CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3100'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Para manejar solicitudes preflight (OPTIONS)
app.options('*', cors());
const fontsRoutes = require('../src/fonts');
const { generateAllThumbnails } = require('../src/generate-thumbnails');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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
  // Si no se especifica public_id, usar el nombre del archivo sin extensión
  const publicId = public_id || file.name.replace(/\.[^/.]+$/, '');
  
  res.json({
    signature,
    timestamp,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
    folder: paramsToSign.folder,
    resource_type: paramsToSign.resource_type,
    public_id: publicId
  });
});

app.use('/', fontsRoutes);

generateAllThumbnails(); // Esto generará las miniaturas al iniciar el servidor

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log('Editor disponible en: http://localhost:3000/editor.html');
  console.log('Catálogo disponible en: http://localhost:3000/catalog.html');
}); 