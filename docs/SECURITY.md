# 🛡️ Guía de Seguridad de Base de Datos

## ⚠️ Vulnerabilidades Identificadas y Solucionadas

### Problemas Críticos Encontrados

1. **Uso de credenciales de superusuario**: El backend estaba usando `postgres`/`admin-cropco` para todas las operaciones
2. **Usuario único para todos los tenants**: Violación del principio de aislamiento multi-tenant
3. **Privilegios excesivos**: El backend tenía acceso total al servidor de base de datos
4. **Ausencia de encriptación**: Credenciales almacenadas en texto plano

### ✅ Soluciones Implementadas

## 1. Usuario Limitado para el Backend

**Antes** (❌ INSEGURO):
```yaml
# docker-compose
POSTGRES_USER: postgres
POSTGRES_PASSWORD: root
```

**Después** (✅ SEGURO):
```yaml
# Variables de entorno requeridas
DB_USERNAME: backend_cropco_user
DB_PASSWORD: cR0pc0_B4ck3nd_S3cur3!2024
TENANT_ENCRYPTION_KEY: tu_clave_de_encriptacion_muy_segura_32_caracteres
```

## 2. Usuarios Dedicados por Tenant

### Configuración de Seguridad

Cada tenant ahora tiene:
- ✅ Usuario de base de datos dedicado
- ✅ Contraseña única generada automáticamente
- ✅ Permisos limitados solo a su base de datos
- ✅ Credenciales encriptadas en la configuración

### Script de Configuración

Ejecutar como superusuario PostgreSQL:

```sql
-- 1. Crear usuario limitado para el backend
CREATE ROLE backend_cropco_user WITH LOGIN PASSWORD 'cR0pc0_B4ck3nd_S3cur3!2024';
ALTER ROLE backend_cropco_user CREATEDB;

-- 2. Crear función para gestión de tenants
CREATE OR REPLACE FUNCTION create_tenant_user(tenant_name TEXT, tenant_password TEXT)
RETURNS TEXT AS $$
DECLARE
    tenant_user_name TEXT;
BEGIN
    tenant_user_name := 'tenant_' || tenant_name || '_user';
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', tenant_user_name, tenant_password);
    RETURN tenant_user_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Otorgar permisos al backend
GRANT EXECUTE ON FUNCTION create_tenant_user(TEXT, TEXT) TO backend_cropco_user;
```

## 3. Variables de Entorno Requeridas

### Configuración Mínima (.env)

```bash
# CONFIGURACIÓN DE BASE DE DATOS
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=backend_cropco_user
DB_PASSWORD=cR0pc0_B4ck3nd_S3cur3!2024
DB_NAME=cropco_management

# SEGURIDAD
JWT_SECRET=tu_clave_jwt_muy_segura_aqui
TENANT_ENCRYPTION_KEY=tu_clave_de_encriptacion_muy_segura_32_caracteres
```

## 4. Arquitectura de Seguridad

### Flujo de Creación de Tenant

1. **Backend** se conecta con `backend_cropco_user`
2. **Crea** nueva base de datos para el tenant
3. **Genera** credenciales únicas para el tenant
4. **Crea** usuario específico del tenant
5. **Asigna** propiedad de la BD al usuario del tenant
6. **Encripta** y almacena las credenciales

### Flujo de Acceso de Tenant

1. **Cliente** accede con subdominio
2. **Backend** obtiene credenciales del tenant
3. **Desencripta** contraseña específica
4. **Conecta** usando usuario dedicado del tenant
5. **Opera** solo en la base de datos del tenant

## 5. Beneficios de Seguridad

### ✅ Principio de Mínimo Privilegio
- Backend: Solo puede crear bases de datos
- Tenants: Solo acceden a su propia base de datos

### ✅ Aislamiento Completo
- Cada tenant tiene usuario dedicado
- Imposible acceso cruzado entre tenants

### ✅ Encriptación de Credenciales
- Contraseñas encriptadas con AES-256-GCM
- Claves de encriptación en variables de entorno

### ✅ Auditoría Granular
- Cada operación identificable por tenant
- Logs específicos por base de datos

## 6. Migración Desde Sistema Actual

### Pasos de Migración

1. **Ejecutar** script de configuración de seguridad
2. **Actualizar** variables de entorno
3. **Crear** usuarios dedicados para tenants existentes
4. **Migrar** credenciales a formato encriptado
5. **Verificar** conexiones de tenants

### Script de Migración

```bash
# 1. Aplicar script de seguridad
psql -U postgres -f scripts/create-backend-user.sql

# 2. Reiniciar servicios con nuevas credenciales
docker-compose restart

# 3. Verificar funcionamiento
npm run test:e2e
```

## 7. Monitoreo de Seguridad

### Métricas a Supervisar

- Intentos de conexión fallidos
- Operaciones con privilegios elevados
- Accesos cruzados entre tenants
- Uso de credenciales de superusuario

### Logs de Seguridad

El sistema ahora registra:
- Creación de usuarios de tenant
- Conexiones con credenciales específicas
- Fallos de desencriptación
- Intentos de acceso no autorizado

## 8. Mejores Prácticas

### ✅ DO (Hacer)
- Usar usuarios dedicados por tenant
- Encriptar credenciales sensibles
- Rotar contraseñas periódicamente
- Monitorear logs de acceso

### ❌ DON'T (No Hacer)
- Usar usuario `postgres` desde el backend
- Compartir credenciales entre tenants
- Almacenar contraseñas en texto plano
- Otorgar permisos excesivos

---

**⚠️ IMPORTANTE**: Esta configuración implementa el principio de mínimo privilegio y asegura el aislamiento completo entre tenants. Es crítico seguir estas prácticas para mantener la seguridad del sistema multi-tenant. 