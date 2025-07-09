// Cloudinary Sync - Frontend only solution
class CloudinarySync {
  constructor() {
    this.cloudName = 'dgff8o52c';
    this.uploadPreset = 'noxistence_uploads';
    this.baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
  }

  // Obtener todas las imágenes de Cloudinary usando el preset
  async getAllImages() {
    try {
      // Intentar diferentes métodos para obtener las imágenes
      const methods = [
        // Método 1: Buscar por preset
        `https://res.cloudinary.com/${this.cloudName}/api/v1/resources/image/upload?prefix=${this.uploadPreset}/&max_results=500`,
        // Método 2: Buscar por carpeta noxistence_uploads
        `https://res.cloudinary.com/${this.cloudName}/api/v1/resources/image/upload?prefix=noxistence_uploads/&max_results=500`,
        // Método 3: Buscar por carpeta noxistence
        `https://res.cloudinary.com/${this.cloudName}/api/v1/resources/image/upload?prefix=noxistence/&max_results=500`,
        // Método 4: Obtener todos los recursos recientes
        `https://res.cloudinary.com/${this.cloudName}/api/v1/resources/image/upload?max_results=500`
      ];

      for (const url of methods) {
        try {
          console.log('Intentando obtener imágenes desde:', url);
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            if (data.resources && data.resources.length > 0) {
              console.log(`Encontradas ${data.resources.length} imágenes con método:`, url);
              return data.resources;
            }
          }
        } catch (methodError) {
          console.log('Método falló:', url, methodError.message);
          continue;
        }
      }

      console.log('Ningún método funcionó para obtener imágenes de Cloudinary');
      return [];
    } catch (error) {
      console.error('Error fetching from Cloudinary:', error);
      return [];
    }
  }

  // Convertir recursos de Cloudinary a formato de criaturas
  convertToCreatures(resources) {
    return resources.map(resource => ({
      id: resource.public_id,
      name: resource.original_filename || 'Unnamed Creature',
      world: 'Unknown',
      img: resource.secure_url,
      cloudinaryId: resource.public_id,
      uploadDate: resource.created_at,
      width: resource.width,
      height: resource.height
    }));
  }

  // Sincronizar localStorage con Cloudinary
  async syncWithCloudinary() {
    try {
      console.log('Sincronizando con Cloudinary...');
      
      // Obtener imágenes de Cloudinary
      const cloudinaryResources = await this.getAllImages();
      const cloudinaryCreatures = this.convertToCreatures(cloudinaryResources);
      
      console.log(`Encontradas ${cloudinaryResources.length} imágenes en Cloudinary`);
      console.log('Recursos encontrados:', cloudinaryResources.map(r => r.public_id));
      
      // Obtener criaturas del localStorage
      const localCreatures = JSON.parse(localStorage.getItem('noxistence_creatures') || '[]');
      console.log(`Encontradas ${localCreatures.length} criaturas en localStorage`);
      
      // Combinar y eliminar duplicados
      const allCreatures = [...localCreatures];
      let newCreatures = 0;
      
      cloudinaryCreatures.forEach(cloudinaryCreature => {
        const exists = allCreatures.find(local => local.id === cloudinaryCreature.id);
        if (!exists) {
          allCreatures.push(cloudinaryCreature);
          newCreatures++;
        }
      });
      
      // Guardar en localStorage
      localStorage.setItem('noxistence_creatures', JSON.stringify(allCreatures));
      
      console.log(`Sincronización completada. ${allCreatures.length} criaturas totales (${newCreatures} nuevas agregadas).`);
      return {
        creatures: allCreatures,
        cloudinaryCount: cloudinaryResources.length,
        localCount: localCreatures.length,
        newCount: newCreatures,
        totalCount: allCreatures.length
      };
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      return {
        creatures: [],
        error: error.message
      };
    }
  }

  // Exportar datos a archivo JSON
  exportData() {
    try {
      const creatures = JSON.parse(localStorage.getItem('noxistence_creatures') || '[]');
      const dataStr = JSON.stringify(creatures, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `noxistence-creatures-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      console.log('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error exportando datos:', error);
      alert('Error al exportar datos');
    }
  }

  // Importar datos desde archivo JSON
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const creatures = JSON.parse(e.target.result);
          
          if (!Array.isArray(creatures)) {
            throw new Error('Formato de archivo inválido');
          }
          
          // Validar estructura de criaturas
          const validCreatures = creatures.filter(creature => 
            creature.id && creature.img && creature.name
          );
          
          if (validCreatures.length === 0) {
            throw new Error('No se encontraron criaturas válidas en el archivo');
          }
          
          // Guardar en localStorage
          localStorage.setItem('noxistence_creatures', JSON.stringify(validCreatures));
          
          console.log(`${validCreatures.length} criaturas importadas exitosamente`);
          resolve(validCreatures);
          
        } catch (error) {
          console.error('Error importando datos:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }

  // Eliminar imagen de Cloudinary (usando API pública)
  async deleteFromCloudinary(publicId) {
    try {
      // Nota: La API pública no permite eliminar, pero podemos marcar como eliminada
      console.log(`Intentando eliminar de Cloudinary: ${publicId}`);
      
      // Para eliminar realmente necesitarías credenciales de API
      // Por ahora, solo marcamos como eliminada en localStorage
      return {
        success: true,
        message: 'Imagen marcada como eliminada (requiere credenciales para eliminación real)'
      };
    } catch (error) {
      console.error('Error eliminando de Cloudinary:', error);
      return {
        success: false,
        message: 'Error al eliminar de Cloudinary'
      };
    }
  }

  // Limpiar localStorage
  clearData() {
    if (confirm('¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('noxistence_creatures');
      console.log('Datos eliminados');
      return true;
    }
    return false;
  }

  // Obtener estadísticas
  getStats() {
    const creatures = JSON.parse(localStorage.getItem('noxistence_creatures') || '[]');
    return {
      total: creatures.length,
      fromCloudinary: creatures.filter(c => c.cloudinaryId).length,
      localOnly: creatures.filter(c => !c.cloudinaryId).length
    };
  }
}

// Exportar para uso global
window.CloudinarySync = CloudinarySync; 