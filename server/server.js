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
  deleteCreature 
} = require('./database');

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
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = `img/${req.file.filename}`;
    const imageName = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const world = req.body.world || 'Default';

    console.log('Datos recibidos:', {
      name: imageName,
      world: world,
      body: req.body
    });

    // Crear nueva criatura en la base de datos
    const newCreature = {
      id: `creature_${Date.now()}`,
      name: imageName,
      world: world,
      img: imagePath,
      cloudinaryId: null,
      uploadDate: new Date().toISOString()
    };

    // Guardar en la base de datos
    const savedCreature = await createCreature(newCreature);

    res.json({
      success: true,
      creature: savedCreature,
      message: 'Imagen subida y criatura guardada en base de datos correctamente'
    });

  } catch (error) {
    console.error('Error al procesar la subida:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
app.delete('/creatures/:id', async (req, res) => {
  try {
    const creatureId = req.params.id;
    
    // Obtener la criatura antes de eliminarla
    const creature = await getCreatureById(creatureId);
    if (!creature) {
      return res.status(404).json({ error: 'Criatura no encontrada' });
    }
    
    console.log('Eliminando criatura:', creature);
    
    // Eliminar el archivo de imagen si existe
    if (creature.img && fs.existsSync(`public/${creature.img}`)) {
      console.log('Eliminando archivo de imagen:', creature.img);
      fs.unlinkSync(`public/${creature.img}`);
    } else {
      console.log('Archivo de imagen no encontrado:', creature.img);
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