const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { uploadToCloudinary } = require('../cloudinary');

// Configuración de multer para archivos temporales
const upload = multer({ dest: 'uploads/' });

const LORE_FILE = path.join(__dirname, '../public/data/lore.json');

// Ensure lore.json exists
async function ensureLoreFile() {
  try {
    await fs.access(LORE_FILE);
  } catch (error) {
    // Create default lore.json if it doesn't exist
    const defaultData = { articles: [] };
    await fs.writeFile(LORE_FILE, JSON.stringify(defaultData, null, 2));
  }
}

// Get all articles
router.get('/', async (req, res) => {
  try {
    await ensureLoreFile();
    const data = await fs.readFile(LORE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading lore data:', error);
    res.status(500).json({ error: 'Error al cargar los artículos' });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const data = await fs.readFile(LORE_FILE, 'utf8');
    const { articles } = JSON.parse(data);
    const article = articles.find(a => a.id === req.params.id);
    
    if (!article) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Error al cargar el artículo' });
  }
});

// Create new article
router.post('/', upload.single('thumbnail'), async (req, res) => {
  try {
    // Asegurarse de que el cuerpo de la solicitud se analice correctamente
    const { title, content, excerpt, author = 'Anónimo', tags = [] } = req.body;
    
    console.log('Datos recibidos:', { title, content, excerpt, author, tags });
    console.log('Archivo recibido:', req.file);
    
    if (!title || !content) {
      console.log('Faltan campos requeridos');
      return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }
    
    // Upload thumbnail if provided
    let thumbnailUrl = '';
    if (req.file) {
      try {
        console.log('Subiendo miniatura a Cloudinary...');
        const uploadResult = await uploadToCloudinary(req.file.path, 'lore/thumbnails');
        thumbnailUrl = uploadResult.secure_url;
        console.log('Miniatura subida correctamente:', thumbnailUrl);
        
        // Eliminar el archivo temporal después de subirlo
        await fs.unlink(req.file.path).catch(console.error);
      } catch (error) {
        console.error('Error al subir la miniatura:', error);
        return res.status(500).json({ error: 'Error al subir la miniatura' });
      }
    }
    
    const newArticle = {
      id: `article-${Date.now()}`,
      title,
      content,
      excerpt: excerpt || '',
      author,
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
      thumbnail: thumbnailUrl,
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      related: []
    };
    
    console.log('Nuevo artículo a guardar:', newArticle);
    
    // Read existing data
    await ensureLoreFile();
    let data;
    try {
      data = await fs.readFile(LORE_FILE, 'utf8');
      console.log('Datos actuales del archivo:', data);
    } catch (error) {
      console.error('Error al leer el archivo lore.json:', error);
      return res.status(500).json({ error: 'Error al leer los datos existentes' });
    }
    let loreData;
    try {
      loreData = JSON.parse(data);
      console.log('Datos parseados correctamente');
    } catch (error) {
      console.error('Error al analizar el JSON:', error);
      // Si hay un error al analizar, creamos una estructura nueva
      loreData = { articles: [] };
    }
    
    // Asegurarse de que exista el array de artículos
    if (!Array.isArray(loreData.articles)) {
      loreData.articles = [];
    }
    
    // Add new article
    loreData.articles.unshift(newArticle);
    
    // Save back to file
    try {
      await fs.writeFile(LORE_FILE, JSON.stringify(loreData, null, 2));
      console.log('Artículo guardado exitosamente en el archivo');
    } catch (error) {
      console.error('Error al guardar el archivo:', error);
      return res.status(500).json({ error: 'Error al guardar el artículo' });
    }
    
    console.log('Artículo creado exitosamente');
    return res.status(201).json(newArticle);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Error al crear el artículo' });
  }
});

// Update article
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, content, excerpt, author, tags } = req.body;
    
    // Read existing data
    await ensureLoreFile();
    const data = await fs.readFile(LORE_FILE, 'utf8');
    const loreData = JSON.parse(data);
    
    // Find article index
    const articleIndex = loreData.articles.findIndex(a => a.id === req.params.id);
    
    if (articleIndex === -1) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    // Update article
    const updatedArticle = { ...loreData.articles[articleIndex] };
    
    if (title) updatedArticle.title = title;
    if (content) updatedArticle.content = content;
    if (excerpt !== undefined) updatedArticle.excerpt = excerpt;
    if (author) updatedArticle.author = author;
    if (tags) updatedArticle.tags = Array.isArray(tags) ? tags : [tags].filter(Boolean);
    
    // Update thumbnail if provided
    if (req.file) {
      try {
        console.log('Actualizando miniatura en Cloudinary...');
        const uploadResult = await uploadToCloudinary(req.file.path, 'lore/thumbnails');
        updatedArticle.thumbnail = uploadResult.secure_url;
        console.log('Miniatura actualizada correctamente:', updatedArticle.thumbnail);
        
        // Eliminar el archivo temporal después de subirlo
        await fs.unlink(req.file.path).catch(console.error);
      } catch (error) {
        console.error('Error al actualizar la miniatura:', error);
        return res.status(500).json({ error: 'Error al actualizar la miniatura' });
      }
    }
    
    updatedArticle.updatedAt = new Date().toISOString();
    
    // Save changes
    loreData.articles[articleIndex] = updatedArticle;
    await fs.writeFile(LORE_FILE, JSON.stringify(loreData, null, 2));
    
    console.log('Artículo actualizado exitosamente');
    res.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    // Read existing data
    const data = await fs.readFile(LORE_FILE, 'utf8');
    const loreData = JSON.parse(data);
    
    // Filter out the article
    const filteredArticles = loreData.articles.filter(a => a.id !== req.params.id);
    
    if (filteredArticles.length === loreData.articles.length) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    // Save changes
    await fs.writeFile(LORE_FILE, JSON.stringify({ articles: filteredArticles }, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Error al eliminar el artículo' });
  }
});

module.exports = router;
