const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const fs = require('fs').promises;
const path = require('path');

// Configurar Cloudinary con las credenciales del entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Sube un archivo a Cloudinary
 * @param {string} filePath - Ruta del archivo a subir
 * @param {string} folder - Carpeta en Cloudinary donde se guardará el archivo
 * @returns {Promise<Object>} - Resultado de la subida a Cloudinary
 */
async function uploadToCloudinary(filePath, folder = 'lore') {
  try {
    // Verificar si el archivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('El archivo no existe:', filePath);
      throw new Error('El archivo no existe');
    }

    // Opciones de carga para Cloudinary
    const options = {
      folder: folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    };

    console.log(`Subiendo archivo a Cloudinary: ${filePath} en la carpeta: ${folder}`);
    
    // Subir el archivo a Cloudinary
    const result = await cloudinary.uploader.upload(filePath, options);
    
    console.log('Archivo subido exitosamente:', result.secure_url);
    return result;
  } catch (error) {
    console.error('Error al subir a Cloudinary:', error);
    throw error;
  }
}

/**
 * Elimina un archivo de Cloudinary
 * @param {string} publicId - ID público del archivo en Cloudinary
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error al eliminar de Cloudinary:', error);
    throw error;
  }
}

/**
 * Sube un buffer de imagen a Cloudinary.
 * @param {Buffer} buffer - El buffer de la imagen a subir.
 * @param {string} folder - La carpeta de destino en Cloudinary.
 * @param {string} publicId - El ID público para el recurso en Cloudinary.
 * @returns {Promise<object>} El resultado de la operación de subida.
 */
function uploadBufferToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const options = {
      folder: folder,
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
    };

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        console.error('Error al subir buffer a Cloudinary:', error);
        return reject(error);
      }
      resolve(result);
    });

    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadBufferToCloudinary,
  cloudinary
};
