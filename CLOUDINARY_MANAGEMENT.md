# Gestión Manual de Cloudinary

## Eliminación de Imágenes

### Problema
La API pública de Cloudinary no permite eliminar archivos sin credenciales de API. Por eso las imágenes solo se eliminan del localStorage pero permanecen en Cloudinary.

### Solución Manual

#### 1. Acceder al Dashboard de Cloudinary
1. Ve a [Cloudinary Dashboard](https://cloudinary.com/console)
2. Inicia sesión con tu cuenta
3. Ve a la sección "Media Library"

#### 2. Encontrar las Imágenes
1. En el panel izquierdo, busca la carpeta `noxistence_uploads` o `noxistence`
2. O usa el buscador para encontrar imágenes por nombre
3. Las imágenes subidas aparecerán con el nombre original del archivo

#### 3. Eliminar Imágenes
1. Selecciona las imágenes que quieres eliminar
2. Haz clic en el botón "Delete" (🗑️)
3. Confirma la eliminación

### Alternativa: Usar API Key (Opcional)

Si quieres eliminación automática, necesitas:

1. **Obtener API Key y Secret:**
   - Ve a tu dashboard de Cloudinary
   - En "Account Details" encontrarás:
     - API Key
     - API Secret

2. **Configurar variables de entorno en Netlify:**
   ```
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   ```

3. **Usar las funciones serverless** (requiere plan pago)

### Estructura de Carpetas en Cloudinary

```
dgff8o52c/
├── noxistence_uploads/     # Imágenes subidas con el preset
│   ├── imagen1.jpg
│   ├── imagen2.png
│   └── ...
└── noxistence/            # Otras imágenes del proyecto
    ├── criatura1.jpg
    └── ...
```

### Consejos

- **Respaldar antes de eliminar:** Usa la función "Exportar Datos" del editor
- **Eliminar en lotes:** Selecciona múltiples imágenes en Cloudinary
- **Verificar nombres:** Las imágenes mantienen su nombre original
- **Revisar regularmente:** Limpia imágenes no utilizadas periódicamente

### Notas Importantes

⚠️ **Advertencia:** La eliminación en Cloudinary es permanente y no se puede deshacer.

✅ **Recomendación:** Mantén un respaldo de tus datos usando la función de exportar del editor. 