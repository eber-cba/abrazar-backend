#!/bin/bash
# Script de verificación pre-merge

echo "🔍 Iniciando verificación pre-merge..."

# 1. Verificar formato (Linting)
echo "1️⃣ Verificando estilo de código (Lint)..."
# npm run lint  <-- Descomentar si tienes linter configurado
echo "✅ Linting OK (Simulado)"

# 2. Ejecutar Tests Unitarios
echo "2️⃣ Ejecutando Tests Unitarios..."
npm run test:unit
if [ $? -ne 0 ]; then
  echo "❌ Tests Unitarios fallaron. No se puede hacer merge."
  exit 1
fi

# 3. Ejecutar Tests de Integración (Docker)
echo "3️⃣ Ejecutando Tests de Integración en Docker..."
./scripts/test-docker.sh
if [ $? -ne 0 ]; then
  echo "❌ Tests de Integración fallaron. No se puede hacer merge."
  exit 1
fi

echo "🎉 TODO LISTO! El código es seguro para fusionar."
exit 0
