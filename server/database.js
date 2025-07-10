const { Pool } = require('pg');

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
        img VARCHAR,
        cloudinary_id VARCHAR,
        upload_date TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Base de datos inicializada correctamente');
    
    // Verificar que la tabla existe
    const result = await pool.query("SELECT COUNT(*) FROM creatures");
    console.log(`📈 Tabla creatures creada, ${result.rows[0].count} criaturas encontradas`);
    
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

module.exports = {
  pool,
  initDatabase,
  getAllCreatures,
  getCreatureById,
  createCreature,
  updateCreature,
  deleteCreature
}; 