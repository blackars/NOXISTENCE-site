# Variables de Entorno para GCloud Run

Este documento describe las variables de entorno necesarias para el despliegue en Google Cloud Run.

## Variables Requeridas

### Autenticación del Editor
- **EDITOR_USER**: Usuario para acceder al editor
- **EDITOR_PASS**: Contraseña para acceder al editor

### Cloudinary (ya configuradas)
- **CLOUDINARY_CLOUD_NAME**: Nombre de la nube en Cloudinary
- **CLOUDINARY_API_KEY**: Clave API de Cloudinary
- **CLOUDINARY_API_SECRET**: Secreto API de Cloudinary

## Configuración en GCloud Run

### Método 1: Usando gcloud CLI
```bash
gcloud run services update noxistence-site \
  --set-env-vars="EDITOR_USER=tu_usuario,EDITOR_PASS=tu_contraseña_segura" \
  --region=us-central1
```

### Método 2: Usando la Consola de Google Cloud
1. Ve a Cloud Run en la consola de Google Cloud
2. Selecciona el servicio `noxistence-site`
3. Ve a la pestaña "Variables de entorno"
4. Agrega las siguientes variables:
   - `EDITOR_USER` = `tu_usuario`
   - `EDITOR_PASS` = `tu_contraseña_segura`

### Método 3: Usando un archivo .env.yaml
```yaml
env_vars:
  EDITOR_USER: "tu_usuario"
  EDITOR_PASS: "tu_contraseña_segura"
```

Luego despliega con:
```bash
gcloud run deploy --env-vars-file .env.yaml
```

## Recomendaciones de Seguridad

1. **Usa contraseñas seguras**: Al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos
2. **No uses credenciales por defecto**: Evita `admin/admin` o similares
3. **Rota las credenciales periódicamente**: Cambia la contraseña regularmente
4. **Usa secretos de Google Secret Manager** para mayor seguridad (opcional)

## Verificación

Después de configurar las variables:
1. Accede a `https://tu-dominio.com/editor.html`
2. Deberías ver el modal de autenticación
3. Ingresa las credenciales configuradas
4. El editor debería cargar correctamente

## Troubleshooting

Si el modal no aparece:
- Verifica que las variables de entorno estén configuradas correctamente
- Revisa los logs del servicio en Cloud Run
- Asegúrate de que el endpoint `/api/verify-auth` esté funcionando

Si las credenciales no funcionan:
- Verifica que no haya espacios en blanco en las variables
- Confirma que las variables estén en mayúsculas
- Revisa los logs del servidor para errores de autenticación
