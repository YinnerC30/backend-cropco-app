# 🚀 Sistema de Versionado Automático

Este proyecto utiliza un sistema de versionado automático que integra:
- **Versionado Semántico** (SemVer)
- **Construcción automática de imágenes Docker**
- **GitHub Actions** para CI/CD
- **Tags de Git** automáticos

## 📋 Versiones

El proyecto sigue el estándar de versionado semántico: `MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles hacia atrás

## 🛠️ Comandos Disponibles

### Versionado Manual

```bash
# Incrementar versión PATCH (0.0.1 → 0.0.2)
npm run version:patch

# Incrementar versión MINOR (0.0.1 → 0.1.0)
npm run version:minor

# Incrementar versión MAJOR (0.0.1 → 1.0.0)
npm run version:major
```

### Construcción de Docker

```bash
# Construir imagen con versión actual
npm run docker:build

# Construir imagen con tag latest
npm run docker:build:latest

# Construir con script personalizado
./scripts/build-docker.sh [registry] [latest]
```

### Release Completo

```bash
# Release con versión PATCH
npm run release:patch

# Release con versión MINOR
npm run release:minor

# Release con versión MAJOR
npm run release:major
```

## 🔄 Workflow Automatizado

### 1. GitHub Actions Manual

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona **Release and Build Docker Image**
3. Haz clic en **Run workflow**
4. Selecciona el tipo de versión (patch/minor/major)
5. El workflow automáticamente:
   - Incrementa la versión en `package.json`
   - Ejecuta todos los tests
   - Construye la imagen Docker
   - Hace push al registry
   - Crea un release en GitHub

### 2. Release con Tags

```bash
# Crear un tag manualmente
git tag v1.0.0
git push origin v1.0.0
```

Esto activará automáticamente el workflow de release.

## 🐳 Imágenes Docker

### Tags Disponibles

- `cropco-api-rest:latest` - Última versión
- `cropco-api-rest:X.Y.Z` - Versión específica

### Variables de Entorno en Docker

La imagen Docker incluye la versión como variable de entorno:

```bash
VERSION=X.Y.Z
NODE_ENV=production
```

### Ejecutar Imagen

```bash
# Última versión
docker run -p 3000:3000 cropco-api-rest:latest

# Versión específica
docker run -p 3000:3000 cropco-api-rest:1.0.0
```

## 🔧 Configuración

### Secrets de GitHub

Configura estos secrets en tu repositorio de GitHub:

- `DOCKER_USERNAME`: Tu usuario de Docker Hub
- `DOCKER_PASSWORD`: Tu contraseña/token de Docker Hub

### Registry Personalizado

Para usar un registry diferente a Docker Hub:

```bash
# Construir con registry personalizado
./scripts/build-docker.sh myregistry.com/miusuario latest

# Hacer push al registry
./scripts/push-docker.sh myregistry.com/miusuario latest
```

## 📝 Convenciones de Commits

Usa commits convencionales para mejor integración:

```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato de código
refactor: refactorización
test: tests
chore: tareas de mantenimiento
```

## 🚨 Troubleshooting

### Error: Docker no está corriendo
```bash
# Verificar que Docker esté corriendo
docker --version
docker ps
```

### Error: Permisos en scripts
```bash
# Dar permisos de ejecución
chmod +x scripts/*.sh
```

### Error: Registry no encontrado
```bash
# Hacer login en Docker Hub
docker login
```

## 📚 Recursos Adicionales

- [Versionado Semántico](https://semver.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Build](https://docs.docker.com/engine/reference/commandline/build/) 