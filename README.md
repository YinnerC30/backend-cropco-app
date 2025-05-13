# Ejecución del proyecto

1. **Instalar las dependencias del proyecto**  
    Ejecuta el siguiente comando para instalar todas las dependencias necesarias:

   ```bash
   npm install
   ```

2. **(Opcional) Configurar el entorno de desarrollo con Docker**
   Este paso es necesario solo si tu entorno requiere un servidor de base de datos PostgreSQL. Ejecuta el archivo `docker-compose.yml` para levantar el servidor:
   ```bash
   docker compose -f 'docker-compose-db.yml' up -d
   ```
3. **Configurar las variables de entorno**
   Copia el archivo `.env.template`, renómbralo a `.env`, y reemplaza las variables de entorno según tu configuración local:

   **Linux:**

   ```bash
   cp .env.template .env
   ```

   **Windows Powershell:**

   ```powershell
   Copy-Item -Path .env.template -Destination .env
   ```

4. **Ejecutar pruebas unitarias y e2e**
   Ejecuta el siguiente comando para iniciar pruebas unitarias:

```bash
   npm run test:unit
```

Ejecuta el siguiente para iniciar pruebas e2e:

```bash
   npm run test:e2e
```

Ejecuta el siguiente para iniciar todas las pruebas:

```bash
   npm run test:all
```

5. **Iniciar el servidor en modo desarrollo**
   Ejecuta el siguiente comando para iniciar el servidor en modo de desarrollo:
   ```bash
   npm run start:dev
   ```
6. **Rellenar la base de datos con datos de prueba**
   Una vez que el servidor esté en ejecución, realiza una solicitud _GET_ a la siguiente URL para rellenar la base de datos con datos de prueba:
   [http://localhost:3000/seed](http://localhost:3000/seed)
