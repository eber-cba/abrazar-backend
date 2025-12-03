# Guía de Testing

Abrazar API utiliza **Jest** y **Supertest** para asegurar la calidad del código.

## 🚀 Ejecutar Tests

### 1. Tests Unitarios

Prueban funciones aisladas sin base de datos.

```bash
npm run test:unit
```

### 2. Tests de Integración

Prueban endpoints completos usando una base de datos de prueba.

```bash
npm run test:integration
```

### 3. Todos los Tests

```bash
npm test
```

## 🐳 Testing con Docker (Recomendado)

Para asegurar que todo funciona en un entorno aislado (igual a producción):

```bash
# Ejecutar todos los tests en el contenedor
docker-compose exec backend npm test

# Ejecutar un archivo específico
docker-compose exec backend npm test -- tests/integration/auth.test.js
```

## 📊 Cobertura de Código

Para ver qué porcentaje del código está cubierto por tests:

```bash
npm run test:coverage
```

## rules Reglas de Testing

1. **Nuevas Features**: Cada nueva funcionalidad debe tener al menos un test de integración (happy path).
2. **Bugs**: Cada bug arreglado debe tener un test que reproduzca el error y verifique la solución.
3. **Limpieza**: Los tests deben limpiar la base de datos después de ejecutarse (usar `afterAll`).
4. **Mocks**: Usa mocks para servicios externos (Email, Google Maps, Cloudinary) para no depender de internet ni gastar créditos.
