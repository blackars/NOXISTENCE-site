require('dotenv').config(); // Al inicio del archivo

// Generar catalog.json automáticamente al iniciar el servidor
// require('../src/generate-catalog');

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
  origin: '*',
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

// const fontsRoutes = require('../src/fonts');
// const { generateAllThumbnailsCollections, generateAllThumbnailsLore } = require('../src/generate-thumbnails');
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


// --- ATENCIÓN: Las siguientes rutas todavía escriben en el sistema de archivos local ---
// --- y deben ser migradas a una base de datos para funcionar en Cloud Run. ---

// Función auxiliar para limpiar tags de criaturas (si aplica)
// function cleanCreaturesTags(creatures) {
//   return creatures.map(creature => {
//     const { tags, ...creatureWithoutTags } = creature;
//     return creatureWithoutTags;
//   });
// }

// Ruta para subir data de criaturas (escribe en creatures.json) - DESHABILITADA PARA CLOUD RUN
// app.post('/api/upload', (req, res) => {
//   try {
//     const creature = req.body;
//     if (!creature || !creature.name || !creature.img) {
//       return res.status(400).json({ error: 'Datos de criatura inválidos' });
//     }
//     const jsonPath = path.join(__dirname, '../public/data/creatures.json');
//     const dirPath = path.dirname(jsonPath);
//     if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
//     let creatures = [];
//     if (fs.existsSync(jsonPath)) {
//       const jsonData = fs.readFileSync(jsonPath, 'utf8');
//       creatures = JSON.parse(jsonData);
//     }
//     creatures.push(creature);
//     fs.writeFileSync(jsonPath, JSON.stringify(creatures, null, 2));
//     res.json({ success: true, creature });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Ruta para obtener todas las criaturas (lee de creatures.json)
app.get('/api/creatures', (req, res) => {
  try {
    const jsonPath = path.join(__dirname, '../public/data/creatures.json');
    if (fs.existsSync(jsonPath)) {
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        res.json(JSON.parse(jsonData));
    } else {
        res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al leer el archivo JSON' });
  }
});

// Ruta para eliminar una criatura (modifica creatures.json y borra archivo local) - DESHABILITADA PARA CLOUD RUN
// app.delete('/api/creatures/:id', (req, res) => {
//   try {
//     const creatureId = req.params.id;
//     const jsonPath = path.join(__dirname, '../public/data/creatures.json');
//     let creatures = [];
//     if (fs.existsSync(jsonPath)) {
//         const jsonData = fs.readFileSync(jsonPath, 'utf8');
//         creatures = JSON.parse(jsonData);
//     }

//     const creatureIndex = creatures.findIndex(c => c.id === creatureId);
//     if (creatureIndex === -1) {
//       return res.status(404).json({ error: 'Criatura no encontrada' });
//     }

//     const creature = creatures[creatureIndex];
//     // ATENCIÓN: Esta parte asume que creature.img es una ruta local.
//     // Si la imagen está en Cloudinary, se necesita el public_id para borrarla.
//     if (creature.img && fs.existsSync(creature.img)) {
//       fs.unlinkSync(creature.img);
//     }

//     creatures.splice(creatureIndex, 1);
//     fs.writeFileSync(jsonPath, JSON.stringify(creatures, null, 2));
//     res.json({ success: true, message: 'Criatura eliminada correctamente' });
//   } catch (error) {
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// });

// --- Fin de las rutas que escriben en disco ---

// Proteger el acceso a /editor.html
app.get('/editor.html', basicAuth({
  users: { [process.env.EDITOR_USER]: process.env.EDITOR_PASS },
  challenge: true,
  realm: 'Editor Area'
}), (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/editor.html'));
});

// app.use('/', fontsRoutes);

// Generate thumbnails on server start
// generateAllThumbnailsCollections()
//   .then(() => generateAllThumbnailsLore())
//   .catch(err => console.error('Error generating thumbnails:', err));

// Fallback para SPA: servir index.html para cualquier otra ruta no encontrada
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
