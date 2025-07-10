const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/noxistence',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para inicializar la base de datos
async function initDatabase() {
  try {
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
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Función para obtener todas las criaturas
async function getAllCreatures() {
  try {
    const result = await pool.query('SELECT * FROM creatures ORDER BY upload_date DESC');
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo criaturas:', error);
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