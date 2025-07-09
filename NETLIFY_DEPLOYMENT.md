# Despliegue en Netlify - NOXISTENCE Site

## Configuración del Proyecto

Este proyecto está configurado para desplegarse en Netlify como un sitio estático con las siguientes características:

### Estructura de Archivos
- **Directorio de publicación**: `public/`
- **Archivos de configuración de Netlify**:
  - `netlify.toml` - Configuración principal
  - `public/_redirects` - Redirecciones y rutas
  - `public/_headers` - Headers de cache y seguridad
  - `public/404.html` - Página de error personalizada

### Scripts de Build
- `npm run build` - Genera catalog.json y thumbnails
- `npm run generate-catalog` - Actualiza el catálogo de archivos
- `npm run generate-thumbnails` - Genera miniaturas de las hojas

## Proceso de Despliegue

### 1. Conectar con Netlify
1. Ve a [netlify.com](https://netlify.com) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Selecciona el repositorio `blackars/NOXISTENCE-site`

### 2. Configuración de Build
- **Build command**: `npm run build`
- **Publish directory**: `public`
- **Node version**: 18 (configurado en netlify.toml)

### 3. Variables de Entorno (Opcional)
Si necesitas generar thumbnails durante el build, configura:
- `VIEWER_URL_BASE`: URL de tu sitio en Netlify (ej: `https://tu-site.netlify.app/viewer.html?file=`)

### 4. Dominio Personalizado (Opcional)
- Puedes configurar un dominio personalizado en la configuración de Netlify
- HTTPS se configura automáticamente

## Características del Despliegue

### Optimización de Cache
- **Archivos estáticos** (JS, CSS, imágenes, fuentes): Cache de 1 año
- **Archivos HTML**: Sin cache (para permitir actualizaciones)
- **Archivos JSON**: Cache de 1 hora

### Seguridad
- Headers de seguridad configurados
- Protección XSS y clickjacking
- Referrer Policy configurado

### Redirecciones
- Rutas principales configuradas
- Manejo de rutas con parámetros
- Redirección a funciones serverless (cuando se implementen)

## Limitaciones del Plan Gratuito

### Netlify
- **Ancho de banda**: 100 GB/mes
- **Build minutes**: 300 minutos/mes
- **Funciones serverless**: 125,000 invocaciones/mes

### Consideraciones
- Los archivos subidos desde el editor necesitarán almacenamiento externo (Cloudinary, S3, etc.)
- Las funciones de backend (subida, borrado) necesitarán ser migradas a serverless

## Próximos Pasos

1. **Integrar Cloudinary** para almacenamiento de media
2. **Migrar funciones de backend** a Netlify Functions
3. **Configurar variables de entorno** para las APIs
4. **Probar el flujo completo** de subida y visualización

## Troubleshooting

### Problemas Comunes
- **Build falla**: Verificar que todas las dependencias estén en `package.json`
- **Rutas no funcionan**: Verificar `_redirects` y `_headers`
- **Thumbnails no se generan**: Configurar `VIEWER_URL_BASE` en variables de entorno

### Logs
- Revisar los logs de build en el dashboard de Netlify
- Verificar que los scripts de generación funcionen correctamente 