#!/bin/bash

# Script para hacer push de imagen Docker con versionado automático
# Uso: ./scripts/push-docker.sh [registry] [latest]

set -e

# Obtener la versión del package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="cropco-api-rest"

# Verificar si se proporciona un registry
if [ -n "$1" ]; then
    REGISTRY="$1/"
else
    echo "❌ Error: Debes especificar un registry"
    echo "Uso: ./scripts/push-docker.sh <registry> [latest]"
    echo "Ejemplo: ./scripts/push-docker.sh docker.io/miusuario"
    exit 1
fi

echo "🚀 Haciendo push de imagen Docker..."
echo "📦 Versión: $VERSION"
echo "🏷️  Imagen: ${REGISTRY}${IMAGE_NAME}:$VERSION"

# Hacer push de la imagen con la versión
docker push "${REGISTRY}${IMAGE_NAME}:$VERSION"

# Si se especifica latest, también hacer push con tag latest
if [ "$2" = "latest" ]; then
    echo "🏷️  Haciendo push también con tag latest..."
    docker push "${REGISTRY}${IMAGE_NAME}:latest"
fi

echo "✅ Push completado exitosamente!"
echo "📋 Imágenes disponibles:"
echo "   ${REGISTRY}${IMAGE_NAME}:$VERSION"
if [ "$2" = "latest" ]; then
    echo "   ${REGISTRY}${IMAGE_NAME}:latest"
fi 