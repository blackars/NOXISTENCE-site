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
      // Usar la API pública de Cloudinary para listar recursos
      const response = await fetch(`https://res.cloudinary.com/${this.cloudName}/api/v1/resources/image/upload?prefix=${this.uploadPreset}/&max_results=500`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Cloudinary');
      }

      const data = await response.json();
      return data.resources || [];
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
      
      // Obtener criaturas del localStorage
      const localCreatures = JSON.parse(localStorage.getItem('noxistence_creatures') || '[]');
      
      // Combinar y eliminar duplicados
      const allCreatures = [...localCreatures];
      
      cloudinaryCreatures.forEach(cloudinaryCreature => {
        const exists = allCreatures.find(local => local.id === cloudinaryCreature.id);
        if (!exists) {
          allCreatures.push(cloudinaryCreature);
        }
      });
      
      // Guardar en localStorage
      localStorage.setItem('noxistence_creatures', JSON.stringify(allCreatures));
      
      console.log(`Sincronización completada. ${allCreatures.length} criaturas totales.`);
      return allCreatures;
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      return [];
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