# Dockerfile optimizado para desarrollo Angular
FROM node:18-bullseye-slim

# Actualizar sistema y instalar dependencias de seguridad
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar herramientas globales una sola vez
RUN npm install -g @angular/cli@16

# Crear directorio de trabajo
WORKDIR /workspace

# Exponer puerto 4200
EXPOSE 4200

# Comando por defecto - mantener container vivo
CMD ["sleep", "infinity"]
