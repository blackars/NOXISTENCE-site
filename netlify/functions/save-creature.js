const fs = require('fs').promises;
const path = require('path');

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const creature = JSON.parse(event.body);
    
    // Validar datos requeridos
    if (!creature.id || !creature.img) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Cargar criaturas existentes
    const creaturesPath = path.join(process.cwd(), 'public', 'data', 'creatures.json');
    let creatures = [];
    
    try {
      const existingData = await fs.readFile(creaturesPath, 'utf8');
      creatures = JSON.parse(existingData);
    } catch (error) {
      // Si el archivo no existe, empezar con array vacío
      console.log('Creating new creatures.json file');
    }

    // Verificar si la criatura ya existe
    const existingIndex = creatures.findIndex(c => c.id === creature.id);
    
    if (existingIndex >= 0) {
      // Actualizar criatura existente
      creatures[existingIndex] = { ...creatures[existingIndex], ...creature };
    } else {
      // Agregar nueva criatura
      creatures.push(creature);
    }

    // Guardar archivo
    await fs.writeFile(creaturesPath, JSON.stringify(creatures, null, 2));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Creature saved successfully',
        creature: existingIndex >= 0 ? creatures[existingIndex] : creature
      })
    };

  } catch (error) {
    console.error('Error saving creature:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Error saving creature' })
    };
  }
}; 