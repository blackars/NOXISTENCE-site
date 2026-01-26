# Configuración de GitHub Container Registry (GHCR)

Este documento explica cómo resolver problemas de permisos al usar GitHub Container Registry con GitHub Actions.

## Problema: `permission_denied: write_package`

Si recibes el error `permission_denied: write_package`, significa que el token no tiene los permisos necesarios para escribir en GHCR. Esto puede ocurrir por:

1. El token no tiene el scope `write:packages`
2. El token está expirado o es inválido
3. El username usado para autenticación no coincide con el propietario del repositorio
4. Para usuarios (no organizaciones), el username debe ser tu nombre de usuario de GitHub

## Soluciones

### Solución: Verificar y crear Personal Access Token (PAT)

**IMPORTANTE**: Para usuarios (no organizaciones), siempre necesitas un Personal Access Token con los permisos correctos.

1. Ve a **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Haz clic en **Generate new token (classic)**
3. Dale un nombre descriptivo (ej: `GHCR_PUSH_TOKEN`)
4. **IMPORTANTE**: Selecciona los siguientes scopes (marca las casillas):
   - ✅ `write:packages` - **OBLIGATORIO** - Para subir imágenes a GHCR
   - ✅ `read:packages` - Para leer imágenes de GHCR
   - ✅ `delete:packages` - (Opcional) Para eliminar imágenes antiguas
5. Haz clic en **Generate token** al final de la página
6. **COPIA EL TOKEN INMEDIATAMENTE** - No podrás verlo de nuevo después de cerrar la página

7. Agrega el token como secret en tu repositorio:
   - Ve a tu repositorio: `https://github.com/blackars/NOXISTENCE-site/settings/secrets/actions`
   - Haz clic en **New repository secret**
   - **Nombre**: `GHCR_TOKEN` (exactamente así, en mayúsculas)
   - **Valor**: Pega el token que copiaste
   - Haz clic en **Add secret**

**Verificación del token**:
- El nombre del secret debe ser exactamente `GHCR_TOKEN` (sin espacios, mayúsculas correctas)
- El token debe tener el scope `write:packages` activado
- Si el token es antiguo, puede estar expirado - crea uno nuevo

### Verificar permisos del workflow

Asegúrate de que el archivo `.github/workflows/deploy.yml` tenga los permisos correctos:

```yaml
permissions:
  contents: 'read'
  id-token: 'write'
  packages: 'write'  # Necesario para escribir en GHCR
```

## Verificación

Después de aplicar cualquiera de las soluciones:

1. Haz push a la rama `docker`
2. Verifica que el workflow se ejecute correctamente
3. Confirma que la imagen se suba a: `https://github.com/blackars/NOXISTENCE-site?tab=packages`
4. Verifica que el package esté marcado como **público** (necesario para Cloud Run)

## Hacer el package público manualmente

Si el step automático falla, puedes hacer el package público manualmente:

1. Ve a `https://github.com/blackars/NOXISTENCE-site?tab=packages`
2. Haz clic en el package `noxistence-site`
3. Ve a **Package settings**
4. En la sección **Danger Zone**, haz clic en **Change visibility**
5. Selecciona **Public** y confirma

O usando la CLI de GitHub:

```bash
gh api -X PATCH /orgs/blackars/packages/container/noxistence-site -f visibility=public
```

## Troubleshooting

### Error: "package not found"
- Verifica que el nombre del package sea exactamente `blackars/noxistence-site` (en minúsculas)
- El primer push crea el package automáticamente

### Error: "authentication required" o "permission_denied: write_package"
- **Verifica que el token tenga el scope `write:packages`** (esto es crítico)
- Asegúrate de que el secret se llame exactamente `GHCR_TOKEN` (no `ghcr_token` ni `GHCR_TOKEN ` con espacios)
- Verifica que el token no esté expirado (los tokens pueden tener fecha de expiración)
- Si el token es antiguo, crea uno nuevo y actualiza el secret
- El username usado debe coincidir con tu nombre de usuario de GitHub (el workflow usa `${{ github.repository_owner }}` automáticamente)

### Cloud Run no puede acceder a la imagen
- Asegúrate de que el package sea **público**
- Verifica que la URL de la imagen sea correcta: `ghcr.io/blackars/noxistence-site:tag`
