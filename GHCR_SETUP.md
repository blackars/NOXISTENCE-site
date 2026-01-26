# Configuración de GitHub Container Registry (GHCR)

Este documento explica cómo resolver problemas de permisos al usar GitHub Container Registry con GitHub Actions.

## Problema: `permission_denied: write_package`

Si recibes el error `permission_denied: write_package`, significa que el `GITHUB_TOKEN` no tiene los permisos necesarios para escribir en GHCR. Esto es común cuando:

1. El repositorio pertenece a una organización con políticas de seguridad estrictas
2. Los permisos del workflow no están correctamente configurados a nivel de organización

## Soluciones

### Solución 1: Configurar permisos a nivel de organización (Recomendado)

1. Ve a la configuración de tu organización en GitHub
2. Navega a **Settings** → **Actions** → **General**
3. En la sección **Workflow permissions**, asegúrate de que:
   - **Read and write permissions** esté seleccionado
   - La opción **Allow GitHub Actions to create and approve pull requests** esté habilitada si es necesario

### Solución 2: Usar Personal Access Token (PAT)

Si la Solución 1 no funciona, crea un Personal Access Token:

1. Ve a **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Haz clic en **Generate new token (classic)**
3. Dale un nombre descriptivo (ej: `GHCR_PUSH_TOKEN`)
4. Selecciona los siguientes scopes:
   - `write:packages` - Para subir imágenes a GHCR
   - `read:packages` - Para leer imágenes de GHCR
   - `delete:packages` - (Opcional) Para eliminar imágenes antiguas
5. Genera el token y **cópialo inmediatamente** (no podrás verlo de nuevo)

6. Agrega el token como secret en tu repositorio:
   - Ve a **Settings** → **Secrets and variables** → **Actions**
   - Haz clic en **New repository secret**
   - Nombre: `GHCR_TOKEN`
   - Valor: Pega el token que copiaste
   - Haz clic en **Add secret**

El workflow ahora usará automáticamente este token si está disponible, o el `GITHUB_TOKEN` como fallback.

### Solución 3: Verificar permisos del workflow

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

### Error: "authentication required"
- Verifica que el token tenga el scope `write:packages`
- Si usas PAT, asegúrate de que el secret `GHCR_TOKEN` esté configurado correctamente

### Cloud Run no puede acceder a la imagen
- Asegúrate de que el package sea **público**
- Verifica que la URL de la imagen sea correcta: `ghcr.io/blackars/noxistence-site:tag`
