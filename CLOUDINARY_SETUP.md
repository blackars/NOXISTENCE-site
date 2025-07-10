# 🌥️ Configuración de Cloudinary

## 📋 Pasos para configurar Cloudinary

### 1. Crear cuenta en Cloudinary
1. Ve a [cloudinary.com](https://cloudinary.com)
2. Regístrate para una cuenta gratuita
3. Confirma tu email

### 2. Obtener credenciales
1. Ve al Dashboard de Cloudinary
2. En la sección "Account Details" encontrarás:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Configurar variables de entorno en Render
1. Ve a tu proyecto en Render
2. Ve a "Environment" → "Environment Variables"
3. Agrega estas variables:
   ```
   CLOUDINARY_CLOUD_NAME = tu_cloud_name
   CLOUDINARY_API_KEY = tu_api_key
   CLOUDINARY_API_SECRET = tu_api_secret
   ```

### 4. Estructura de carpetas en Cloudinary
El sistema creará automáticamente estas carpetas:
- `noxistence/creatures/` - Para imágenes de criaturas
- `noxistence/art/` - Para imágenes de arte

### 5. Ventajas de usar Cloudinary
- ✅ **Almacenamiento ilimitado** (plan gratuito: 25GB)
- ✅ **Optimización automática** de imágenes
- ✅ **CDN global** para carga rápida
- ✅ **Transformaciones** automáticas (redimensionar, comprimir)
- ✅ **Eliminación automática** cuando se borran registros

### 6. Funcionalidades implementadas
- **Subida automática** a Cloudinary al crear criaturas/arte
- **Eliminación automática** de Cloudinary al borrar registros
- **URLs optimizadas** para mejor rendimiento
- **Manejo de errores** si Cloudinary no está disponible

### 7. Migración de datos existentes
Si tienes imágenes en base64 en la base de datos:
1. Las imágenes existentes seguirán funcionando
2. Las nuevas imágenes se subirán a Cloudinary
3. Puedes migrar manualmente las existentes si lo deseas

### 8. Monitoreo
- Revisa el dashboard de Cloudinary para ver el uso
- Los logs del servidor mostrarán las operaciones de Cloudinary
- El plan gratuito incluye 25GB de almacenamiento y 25GB de ancho de banda

## 🔧 Comandos útiles

```bash
# Verificar que Cloudinary está configurado
npm start

# Los logs mostrarán:
# ✅ Imagen subida a Cloudinary: noxistence/creatures/creature_1234567890
# ✅ Imagen eliminada de Cloudinary: noxistence/creatures/creature_1234567890
```

## 🚨 Solución de problemas

### Error: "Cloudinary config not found"
- Verifica que las variables de entorno estén configuradas en Render
- Reinicia el servicio después de agregar las variables

### Error: "Upload failed"
- Verifica que las credenciales sean correctas
- Revisa que no hayas excedido los límites del plan gratuito

### Imágenes no se cargan
- Verifica que las URLs de Cloudinary sean accesibles
- Revisa la consola del navegador para errores de CORS 