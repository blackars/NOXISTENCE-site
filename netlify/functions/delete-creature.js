const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dgff8o52c',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id } = JSON.parse(event.body);
    
    if (!id) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing creature ID' })
      };
    }

    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(id);
      console.log(`Deleted from Cloudinary: ${id}`);
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
      // Continuar aunque falle Cloudinary para eliminar del JSON
    }

    // Eliminar del archivo JSON
    const creaturesPath = path.join(process.cwd(), 'public', 'data', 'creatures.json');
    let creatures = [];
    
    try {
      const existingData = await fs.readFile(creaturesPath, 'utf8');
      creatures = JSON.parse(existingData);
    } catch (error) {
      console.log('No creatures.json file found');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Creature deleted from Cloudinary' 
        })
      };
    }

    // Filtrar la criatura eliminada
    const originalLength = creatures.length;
    creatures = creatures.filter(creature => creature.id !== id);

    if (creatures.length === originalLength) {
      return {
        statusCode: 404,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Creature not found' })
      };
    }

    // Guardar archivo actualizado
    await fs.writeFile(creaturesPath, JSON.stringify(creatures, null, 2));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Creature deleted successfully' 
      })
    };

  } catch (error) {
    console.error('Error deleting creature:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Error deleting creature' })
    };
  }
}; 