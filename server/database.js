const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/noxistence',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión a la base de datos
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error de conexión PostgreSQL:', err);
});

// Función para inicializar la base de datos
async function initDatabase() {
  try {
    console.log('🔧 Inicializando base de datos...');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'No configurado');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    
    // Crear tabla de criaturas si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS creatures (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        world VARCHAR,
        img VARCHAR(500),
        cloudinary_id VARCHAR,
        upload_date TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Crear tabla de imágenes de arte si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS art_images (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        img VARCHAR(500),
        cloudinary_id VARCHAR,
        original_name VARCHAR,
        upload_date TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Base de datos inicializada correctamente');
    
    // Verificar que las tablas existen
    const creaturesResult = await pool.query("SELECT COUNT(*) FROM creatures");
    const artResult = await pool.query("SELECT COUNT(*) FROM art_images");
    console.log(`📈 Tabla creatures creada, ${creaturesResult.rows[0].count} criaturas encontradas`);
    console.log(`🎨 Tabla art_images creada, ${artResult.rows[0].count} imágenes de arte encontradas`);
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

// Función para obtener todas las criaturas
async function getAllCreatures() {
  try {
    console.log('🔍 Obteniendo criaturas de la base de datos...');
    
    // Verificar si tenemos conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No hay DATABASE_URL configurada, usando fallback');
      return [];
    }
    
    const result = await pool.query('SELECT * FROM creatures ORDER BY upload_date DESC');
    console.log(`📊 ${result.rows.length} criaturas encontradas`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo criaturas:', error);
    console.error('🔍 Detalles del error:', error.message);
    return [];
  }
}

// Función para obtener una criatura por ID
async function getCreatureById(id) {
  try {
    const result = await pool.query('SELECT * FROM creatures WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error obteniendo criatura:', error);
    return null;
  }
}

// Función para crear una nueva criatura
async function createCreature(creature) {
  try {
    // Verificar si tenemos conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No hay DATABASE_URL configurada, simulando creación');
      return {
        ...creature,
        id: creature.id || `creature_${Date.now()}`,
        upload_date: new Date().toISOString()
      };
    }
    
    const result = await pool.query(`
      INSERT INTO creatures (id, name, world, img, cloudinary_id, upload_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [creature.id, creature.name, creature.world, creature.img, creature.cloudinaryId, creature.uploadDate]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creando criatura:', error);
    throw error;
  }
}

// Función para actualizar una criatura
async function updateCreature(id, updates) {
  try {
    const result = await pool.query(`
      UPDATE creatures 
      SET name = $1, world = $2, img = $3, cloudinary_id = $4
      WHERE id = $5
      RETURNING *
    `, [updates.name, updates.world, updates.img, updates.cloudinaryId, id]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error actualizando criatura:', error);
    throw error;
  }
}

// Función para eliminar una criatura
async function deleteCreature(id) {
  try {
    const result = await pool.query('DELETE FROM creatures WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error eliminando criatura:', error);
    throw error;
  }
}

// Función para crear una imagen de arte
async function createArtImage(art) {
  try {
    // Verificar si tenemos conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No hay DATABASE_URL configurada, simulando creación de arte');
      return {
        ...art,
        id: art.id || `art_${Date.now()}`,
        upload_date: new Date().toISOString()
      };
    }
    
    const result = await pool.query(`
      INSERT INTO art_images (id, name, img, cloudinary_id, original_name, upload_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [art.id, art.name, art.img, art.cloudinaryId, art.originalName, art.uploadDate]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creando imagen de arte:', error);
    throw error;
  }
}

// Función para obtener todas las imágenes de arte
async function getAllArtImages() {
  try {
    console.log('🎨 Obteniendo imágenes de arte de la base de datos...');
    
    // Verificar si tenemos conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No hay DATABASE_URL configurada, usando fallback para arte');
      return [];
    }
    
    const result = await pool.query('SELECT * FROM art_images ORDER BY upload_date DESC');
    console.log(`🎨 ${result.rows.length} imágenes de arte encontradas`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo imágenes de arte:', error);
    console.error('🔍 Detalles del error:', error.message);
    return [];
  }
}

// Función para eliminar una imagen de arte
async function deleteArtImage(id) {
  try {
    const result = await pool.query('DELETE FROM art_images WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error eliminando imagen de arte:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase,
  getAllCreatures,
  getCreatureById,
  createCreature,
  updateCreature,
  deleteCreature,
  createArtImage,
  getAllArtImages,
  deleteArtImage
}; 