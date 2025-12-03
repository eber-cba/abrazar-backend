#!/bin/bash
# Script para ejecutar tests en Docker

echo "🐳 Iniciando tests en Docker..."

# Asegurar que el contenedor esté corriendo
docker-compose up -d backend

# Ejecutar tests
echo "🧪 Ejecutando suite de pruebas..."
docker-compose exec -T backend npm test

# Capturar código de salida
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Todos los tests pasaron exitosamente!"
else
  echo "❌ Algunos tests fallaron."
fi

exit $EXIT_CODE
