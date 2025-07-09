# Configuración de Variables de Entorno

## Variables necesarias para Netlify

Para que las funciones serverless funcionen correctamente, necesitas configurar las siguientes variables de entorno en tu dashboard de Netlify:

### 1. Ir a tu dashboard de Netlify
- Ve a tu sitio en Netlify
- Haz clic en "Site settings"
- Ve a "Environment variables"

### 2. Agregar las siguientes variables:

```
CLOUDINARY_API_KEY=tu_api_key_de_cloudinary
CLOUDINARY_API_SECRET=tu_api_secret_de_cloudinary
```

### 3. Obtener las credenciales de Cloudinary:
1. Ve a tu dashboard de Cloudinary
2. En la sección "Account Details" encontrarás:
   - Cloud name: `dgff8o52c` (ya configurado)
   - API Key: copia este valor
   - API Secret: copia este valor

### 4. Después de configurar las variables:
- Haz un nuevo deploy de tu sitio
- Las funciones serverless deberían funcionar correctamente

## Funciones disponibles

- `/.netlify/functions/get-creatures` - Obtener todas las criaturas de Cloudinary
- `/.netlify/functions/save-creature` - Guardar metadatos de criatura
- `/.netlify/functions/delete-creature` - Eliminar criatura de Cloudinary y JSON 