const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dgff8o52c',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
  // Habilitar CORS
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

  try {
    // Obtener todas las imágenes de Cloudinary con el preset noxistence_uploads
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'noxistence_uploads/', // Buscar solo imágenes subidas con nuestro preset
      max_results: 500,
      resource_type: 'image'
    });

    // Convertir recursos de Cloudinary a formato de criaturas
    const creatures = result.resources.map(resource => ({
      id: resource.public_id,
      name: resource.original_filename || 'Unnamed Creature',
      world: 'Unknown',
      img: resource.secure_url,
      cloudinaryId: resource.public_id,
      uploadDate: resource.created_at,
      width: resource.width,
      height: resource.height
    }));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(creatures)
    };

  } catch (error) {
    console.error('Error fetching creatures:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Error fetching creatures' })
    };
  }
}; 