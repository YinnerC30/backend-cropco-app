#!/bin/bash

# Script para construir imagen Docker con versionado automático
# Uso: ./scripts/build-docker.sh [registry] [latest]

set -e

# Obtener la versión del package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="cropco-api-rest"

# Verificar si se proporciona un registry
if [ -n "$1" ]; then
    REGISTRY="$1/"
else
    REGISTRY=""
fi

echo "🔨 Construyendo imagen Docker..."
echo "📦 Versión: $VERSION"
echo "🏷️  Imagen: ${REGISTRY}${IMAGE_NAME}:$VERSION"

# Construir la imagen con la versión
docker build \
    --build-arg VERSION=$VERSION \
    -t "${REGISTRY}${IMAGE_NAME}:$VERSION" \
    .

# Si se especifica latest, también construir con tag latest
if [ "$2" = "latest" ]; then
    echo "🏷️  Construyendo también con tag latest..."
    docker tag "${REGISTRY}${IMAGE_NAME}:$VERSION" "${REGISTRY}${IMAGE_NAME}:latest"
fi

echo "✅ Imagen construida exitosamente!"
echo "📋 Comandos útiles:"
echo "   docker run -p 3000:3000 ${REGISTRY}${IMAGE_NAME}:$VERSION"
if [ "$2" = "latest" ]; then
    echo "   docker run -p 3000:3000 ${REGISTRY}${IMAGE_NAME}:latest"
fi 