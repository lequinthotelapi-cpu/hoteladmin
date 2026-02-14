#!/bin/bash

# Script de despliegue de Firebase Functions
# Uso: ./deploy-functions.sh [token]

set -e

echo "🚀 Iniciando despliegue de Firebase Functions..."

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado"
    echo "Instalar con: npm install -g firebase-tools"
    exit 1
fi

# Ir al directorio de functions
cd functions

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Volver a la raíz
cd ..

# Desplegar
if [ -z "$1" ]; then
    echo "🔐 Desplegando con autenticación interactiva..."
    firebase deploy --only functions
else
    echo "🔐 Desplegando con token CI..."
    firebase deploy --only functions --token "$1"
fi

echo "✅ Despliegue completado exitosamente!"
echo ""
echo "📊 Ver logs:"
echo "   firebase functions:log"
echo ""
echo "🔍 Ver función en consola:"
echo "   https://console.firebase.google.com/project/_/functions"
