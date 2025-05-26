# 🌱 CropCo Backend

## 📝 Descripción general

CropCo Backend es una aplicación desarrollada en NestJS para la gestión integral de actividades agrícolas. Permite administrar cultivos, empleados, ventas, compras, cosechas, trabajos, insumos y generar reportes para la toma de decisiones en empresas agrícolas.

## 🚀 Características principales

- 🌾 Gestión de cultivos: registro, seguimiento y control de producción.
- 👨‍🌾 Gestión de empleados: administración y asignación de tareas y cosechas.
- 🧑‍💼 Gestión de clientes y ventas: registro de clientes y control de ventas de productos agrícolas.
- 🚚 Gestión de proveedores e insumos: compras, consumos y relación con proveedores.
- 🧺 Gestión de cosechas: registro de producción y procesamiento.
- 🛠️ Gestión de trabajos: actividades laborales, pagos y detalles de tareas.
- 💸 Pagos y consumos: control de pagos y consumos de insumos.
- 📊 Panel de control: reportes y estadísticas de todas las áreas.

## 🏗️ Arquitectura y tecnologías

- **Framework:** [NestJS](https://nestjs.com/) ⚡
- **Base de datos:** PostgreSQL 🐘
- **ORM:** TypeORM 🗄️
- **Validación:** class-validator ✅
- **Pruebas:** Jest (unitarias y e2e) 🧪
- **Contenedores:** Docker y Docker Compose 🐳

## 🗂️ Estructura del proyecto

```
├── src/
│   ├── auth/           # 🔐 Autenticación y autorización
│   ├── clients/        # 👥 Gestión de clientes
│   ├── common/         # 🧰 Utilidades y decoradores compartidos
│   ├── consumptions/   # 🍽️ Consumo de insumos
│   ├── crops/          # 🌾 Gestión de cultivos
│   ├── dashboard/      # 📊 Reportes y estadísticas
│   ├── employees/      # 👨‍🌾 Gestión de empleados
│   ├── harvest/        # 🧺 Gestión de cosechas
│   ├── payments/       # 💸 Pagos
│   ├── printer/        # 🖨️ Utilidades de impresión
│   ├── sales/          # 🛒 Ventas
│   ├── seed/           # 🌱 Inicialización de datos
│   ├── shopping/       # 🛍️ Compras de insumos
│   ├── suppliers/      # 🚚 Proveedores
│   ├── supplies/       # 📦 Insumos
│   ├── users/          # 🧑‍💻 Usuarios del sistema
│   └── work/           # 🛠️ Trabajos y actividades
```

## ⚙️ Instalación y ejecución

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **(Opcional) Configurar base de datos con Docker**

   Si necesitas un servidor PostgreSQL local:

   ```bash
   docker compose -f 'docker-compose-db.yml' up -d
   ```

3. **Configurar variables de entorno**

   Copia el archivo `.env.template` a `.env` y ajusta según tu entorno:

   ```bash
   cp .env.template .env
   # o en Windows Powershell
   Copy-Item -Path .env.template -Destination .env
   ```

4. **Iniciar el servidor en modo desarrollo**

   ```bash
   npm run start:dev
   ```

## 🐳 Construcción y despliegue con Docker

El proyecto incluye un `Dockerfile` multi-etapa para construir y ejecutar la aplicación de forma eficiente:

1. **Construir la imagen:**

   ```bash
   docker build -t cropco-backend .
   ```

2. **Ejecutar el contenedor:**

   ```bash
   docker run -p 3000:3000 --env-file .env cropco-backend
   ```

### Etapas del Dockerfile

- **all-deps:** Instala todas las dependencias (desarrollo y producción).
- **prod-deps:** Instala solo dependencias de producción.
- **tester:** Ejecuta pruebas unitarias.
- **builder:** Compila la aplicación NestJS.
- **runner:** Imagen final, solo con dependencias de producción y el código compilado listo para ejecutarse.

Puedes personalizar los comandos de acuerdo a tu entorno y necesidades.

## 🧪 Pruebas

- Ejecutar pruebas unitarias:

  ```bash
  npm run test:unit
  ```

- Ejecutar pruebas e2e:

  ```bash
  npm run test:e2e
  ```

- Ejecutar todas las pruebas:

  ```bash
  npm run test:all
  ```

## 🌱 Inicialización de datos de prueba

Con el servidor en ejecución, puedes poblar la base de datos accediendo a:

[http://localhost:3000/seed](http://localhost:3000/seed)

## 👥 Autores

- **Yinner Chilito** - _Desarrollo inicial_

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
