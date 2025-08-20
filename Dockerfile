# Usa una imagen con soporte para Puppeteer
FROM node:18-alpine

# Instala dependencias del sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Configura Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=3000

# Crea el directorio de la aplicación
WORKDIR /usr/src/app

# Instala dependencias
COPY package*.json ./
RUN npm ci

# Copia el código fuente
COPY . .

# Construye la aplicación
RUN npm run build

# Expone el puerto
EXPOSE 3000

# Define el comando de inicio
CMD ["node", "server/server.js"]