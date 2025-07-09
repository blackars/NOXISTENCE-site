# NOXISTENCE Site - Editor de Criaturas

Sistema para gestionar criaturas y crear layouts visuales.

## Instalación

1. **Instalar Node.js** (si no lo tienes ya)
   - Descarga desde: https://nodejs.org/

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```

4. **Abrir en el navegador**
   - Editor: http://localhost:3000/editor.html
   - Catálogo: http://localhost:3000/catalog.html

## Estructura del Proyecto

```
/
├── server.js              # Servidor Node.js
├── package.json           # Dependencias
├── editor.html            # Editor de criaturas
├── catalog.html           # Catálogo de layouts
├── data/
│   └── creatures.json     # Metadatos de criaturas
├── img/                   # Imágenes de criaturas
└── fonts/                 # Fuentes personalizadas
    └── fonts.json         # Lista de fuentes
```

## Funcionalidades

### Editor (editor.html)
- **Subir criaturas**: Selecciona imagen, nombre, mundo y tags
- **Gestionar criaturas**: Ver lista y eliminar criaturas existentes
- **Crear layouts**: Arrastra, escala y rota criaturas
- **Exportar layouts**: Guarda la disposición actual como JSON

### Catálogo (catalog.html)
- **Ver layouts**: Lista todos los archivos JSON de layouts
- **Abrir layouts**: Hace clic para abrir en el visualizador

### Servidor
- **Subir imágenes**: Guarda en `/img/` y actualiza `creatures.json`
- **API REST**: Endpoints para gestionar criaturas
- **Archivos estáticos**: Sirve HTML, CSS, JS e imágenes

## API Endpoints

- `POST /upload` - Subir nueva criatura
- `GET /creatures` - Obtener todas las criaturas
- `DELETE /creatures/:id` - Eliminar criatura

## Uso

1. **Agregar criaturas**:
   - Abre el editor
   - Completa el formulario de subida
   - La imagen se guarda en `/img/` y se actualiza `creatures.json`

2. **Crear layouts**:
   - Las criaturas aparecen automáticamente en el grid
   - Arrastra, escala (Shift + rueda) y rota (Alt + rueda)
   - Exporta el layout con "Guardar Hoja"

3. **Gestionar contenido**:
   - Ve la lista de criaturas en el panel derecho
   - Elimina criaturas con el botón ×
   - Los cambios se reflejan inmediatamente

## Desarrollo

Para desarrollo con recarga automática:
```bash
npm run dev
```

## Notas

- Las imágenes se guardan con nombres únicos basados en timestamp
- El JSON se actualiza automáticamente al subir/eliminar criaturas
- Los layouts se guardan en localStorage del navegador
- El sistema es compatible con tu estructura JSON existente 