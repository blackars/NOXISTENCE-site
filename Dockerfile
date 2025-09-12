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

RUN apt-get update && apt-get install -y \
    chromium \
    # Dependencias comunes de Puppeteer para Debian
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libappindicator1 \
    libnss3-tools \
    lsb-release \
    xdg-utils \
    wget \
    fonts-liberation \
    libgbm-dev \
    libu2f-udev \
    libvulkan1 \
    xauth \
    xvfb \
    # Asegúrate de que las fuentes estén instaladas
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

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