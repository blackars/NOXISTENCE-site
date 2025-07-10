require('dotenv').config(); // Al inicio del archivo

// Generar catalog.json automáticamente al iniciar el servidor
require('../src/generate-catalog');

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const app = express();
const port = process.env.PORT || 3000;
const fontsRoutes = require('../src/fonts');
const { generateAllThumbnails } = require('../src/generate-thumbnails');

// Importar configuración de base de datos
const { 
  initDatabase, 
  getAllCreatures, 
  getCreatureById, 
  createCreature, 
  updateCreature, 
  deleteCreature,
  createArtImage,
  getAllArtImages,
  deleteArtImage
} = require('./database');

// Importar configuración de Cloudinary
const { uploadToCloudinary, deleteFromCloudinary } = require('./cloudinary');

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

// Configurar multer para subir imágenes (usar memoria en producción)
const storage = process.env.NODE_ENV === 'production' 
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// Configurar multer para subir imágenes de arte (usar memoria en producción)
const artStorage = process.env.NODE_ENV === 'production' 
  ? multer.memoryStorage()
  : multer.diskStorage({
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
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageName = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const world = req.body.world || 'Default';

    console.log('Datos recibidos:', {
      name: imageName,
      world: world,
      body: req.body,
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir imagen a Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'noxistence/creatures',
      public_id: `creature_${Date.now()}`
    });
    
    // Crear nueva criatura en la base de datos
    const newCreature = {
      id: `creature_${Date.now()}`,
      name: imageName,
      world: world,
      img: cloudinaryResult.secure_url, // URL de Cloudinary
      cloudinaryId: cloudinaryResult.public_id,
      uploadDate: new Date().toISOString()
    };

    // Guardar en la base de datos
    const savedCreature = await createCreature(newCreature);

    res.json({
      success: true,
      creature: savedCreature,
      message: 'Criatura subida a Cloudinary y guardada en base de datos'
    });

  } catch (error) {
    console.error('Error al procesar la subida:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Ruta para subir imágenes de arte
app.post('/upload-art', uploadArt.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const imageName = req.file.originalname.replace(/\.[^/.]+$/, '');

    console.log('Imagen de arte subida:', {
      name: imageName,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir imagen a Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'noxistence/art',
      public_id: `art_${Date.now()}`
    });

    // Crear nueva imagen de arte en la base de datos
    const newArt = {
      id: `art_${Date.now()}`,
      name: imageName,
      img: cloudinaryResult.secure_url, // URL de Cloudinary
      cloudinaryId: cloudinaryResult.public_id,
      originalName: req.file.originalname,
      uploadDate: new Date().toISOString()
    };

    // Guardar en la base de datos
    const savedArt = await createArtImage(newArt);

    res.json({
      success: true,
      art: savedArt,
      message: 'Imagen de arte subida a Cloudinary y guardada en base de datos'
    });

  } catch (error) {
    console.error('Error al procesar la subida de arte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener todas las criaturas
app.get('/creatures', async (req, res) => {
  try {
    const creatures = await getAllCreatures();
    res.json(creatures);
  } catch (error) {
    console.error('Error obteniendo criaturas:', error);
    res.status(500).json({ error: 'Error al obtener las criaturas' });
  }
});

// Ruta para obtener todas las imágenes de arte
app.get('/art', async (req, res) => {
  try {
    const artImages = await getAllArtImages();
    res.json(artImages);
  } catch (error) {
    console.error('Error obteniendo imágenes de arte:', error);
    res.status(500).json({ error: 'Error al obtener las imágenes de arte' });
  }
});

// Ruta para eliminar una criatura
app.delete('/creatures/:id', async (req, res) => {
  try {
    const creatureId = req.params.id;
    
    // Obtener la criatura antes de eliminarla
    const creature = await getCreatureById(creatureId);
    if (!creature) {
      return res.status(404).json({ error: 'Criatura no encontrada' });
    }
    
    console.log('Eliminando criatura:', creature);
    
    // Eliminar de Cloudinary si existe
    if (creature.cloudinary_id) {
      try {
        await deleteFromCloudinary(creature.cloudinary_id);
        console.log('Imagen eliminada de Cloudinary:', creature.cloudinary_id);
      } catch (cloudinaryError) {
        console.error('Error eliminando de Cloudinary:', cloudinaryError);
        // Continuar con la eliminación de la base de datos aunque falle Cloudinary
      }
    }

    // Eliminar de la base de datos
    await deleteCreature(creatureId);

    res.json({ success: true, message: 'Criatura eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para eliminar una imagen de arte
app.delete('/art/:id', async (req, res) => {
  try {
    const artId = req.params.id;
    
    // Obtener la imagen de arte antes de eliminarla
    const artImages = await getAllArtImages();
    const artImage = artImages.find(art => art.id === artId);
    
    if (!artImage) {
      return res.status(404).json({ error: 'Imagen de arte no encontrada' });
    }
    
    console.log('Eliminando imagen de arte:', artImage);
    
    // Eliminar de Cloudinary si existe
    if (artImage.cloudinary_id) {
      try {
        await deleteFromCloudinary(artImage.cloudinary_id);
        console.log('Imagen de arte eliminada de Cloudinary:', artImage.cloudinary_id);
      } catch (cloudinaryError) {
        console.error('Error eliminando de Cloudinary:', cloudinaryError);
        // Continuar con la eliminación de la base de datos aunque falle Cloudinary
      }
    }
    
    // Eliminar de la base de datos
    await deleteArtImage(artId);
    
    res.json({ 
      success: true, 
      message: 'Imagen de arte eliminada correctamente' 
    });

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

app.use('/', fontsRoutes);

// Inicializar base de datos y generar miniaturas al iniciar el servidor
async function initializeServer() {
  try {
    await initDatabase();
    await generateAllThumbnails();
    console.log('✅ Servidor inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando servidor:', error);
  }
}

initializeServer();

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log('📝 Editor disponible en: http://localhost:3000/editor.html');
  console.log('📚 Catálogo disponible en: http://localhost:3000/catalog.html');
  console.log('🗄️ Base de datos PostgreSQL conectada');
}); 