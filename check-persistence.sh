#!/bin/bash

echo "🔍 Verificando persistencia del Dev Container..."

echo "📁 Archivos que persisten:"
echo "✅ Código fuente: $(ls -la src/ | wc -l) archivos"
echo "✅ node_modules: $(ls -la node_modules/ 2>/dev/null | wc -l) paquetes"
echo "✅ package.json: $(test -f package.json && echo 'Existe' || echo 'No existe')"
echo "✅ .angular cache: $(ls -la .angular/ 2>/dev/null | wc -l) archivos de cache"

echo ""
echo "🚀 Comandos disponibles:"
echo "npm start    - Iniciar servidor de desarrollo"
echo "npm install  - Instalar dependencias (rápido si ya están cacheadas)"
echo "ng version   - Ver versión de Angular CLI"

echo ""
echo "💡 Todo persiste automáticamente entre sesiones del Dev Container"