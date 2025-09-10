# --- Etapa 1: Build ---
# Usa una imagen de Node completa para tener todas las herramientas de build
FROM node:20 as builder

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de definición de paquetes y dependencias
COPY package*.json ./

# Instala todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copia el resto del código fuente de la aplicación
COPY . .

# Ejecuta el script de build para generar los archivos de producción en /dist
RUN npm run build


# --- Etapa 2: Production ---
# Empieza desde una imagen Alpine ligera para producción
FROM node:20

# Elimina las instalaciones de Puppeteer/Chromium y sus variables de entorno
# RUN apk add --no-cache \
#     chromium \
#     nss \
#     freetype \
#     harfbuzz \
#     ca-certificates \
#     ttf-freefont

# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
#     PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
#     NODE_ENV=production

ENV NODE_ENV=production

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de definición de paquetes desde la etapa de build
COPY --from=builder /usr/src/app/package*.json .
# Instala ÚNICAMENTE las dependencias de producción
RUN npm ci --omit=dev

# Copia los artefactos de build (la carpeta dist) desde la etapa de build
COPY --from=builder /usr/src/app/dist ./dist

# Copia el código del servidor y los scripts que necesita para correr
COPY --from=builder /usr/src/app/server ./server
COPY --from=builder /usr/src/app/src ./src

# Expone el puerto 8080, el default que usa Cloud Run. 
# Tu app escuchará en el valor de process.env.PORT
EXPOSE 8080

# Define el comando de inicio del servidor
CMD ["node", "server/server.js"]