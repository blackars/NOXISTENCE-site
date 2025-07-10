const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función para subir imagen a Cloudinary
async function uploadToCloudinary(fileBuffer, options = {}) {
  try {
    const uploadOptions = {
      folder: 'noxistence',
      resource_type: 'auto',
      ...options
    };

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(fileBuffer);
    });

    console.log('✅ Imagen subida a Cloudinary:', result.public_id);
    return result;
  } catch (error) {
    console.error('❌ Error subiendo a Cloudinary:', error);
    throw error;
  }
}

// Función para eliminar imagen de Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    if (!publicId) return;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Imagen eliminada de Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Error eliminando de Cloudinary:', error);
    throw error;
  }
}

// Función para obtener URL optimizada
function getOptimizedUrl(publicId, options = {}) {
  if (!publicId) return null;
  
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };
  
  return cloudinary.url(publicId, defaultOptions);
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl
}; 