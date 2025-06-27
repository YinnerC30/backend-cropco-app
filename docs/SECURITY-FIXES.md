# 🔧 Aplicación de Correcciones de Seguridad

## ✅ Problemas Corregidos

### 1. Error de Firma de Método
**Problema**: `configDataBaseTenant` esperaba 1 argumento pero recibía 3
**Solución**: ✅ Actualizada la firma del método para aceptar `tenantUsername` y `tenantPassword`

### 2. Credenciales de Superusuario
**Problema**: El backend usaba credenciales de `postgres`/`admin-cropco`
**Solución**: ✅ Implementado usuario limitado `backend_cropco_user`

### 3. Métodos de Encriptación
**Problema**: Uso de APIs deprecadas de crypto
**Solución**: ✅ Corregidos métodos de encriptación/desencriptación

### 4. Usuario Único para Todos los Tenants
**Problema**: Violación del aislamiento multi-tenant
**Solución**: ✅ Usuarios dedicados por tenant con credenciales únicas

## 🚀 Pasos de Implementación

### Paso 1: Aplicar Scripts de Base de Datos

```bash
# 1. Ejecutar script de configuración de seguridad
psql -U postgres -d postgres -f scripts/create-backend-user.sql

# 2. (Opcional) Migrar tenants existentes
psql -U postgres -d cropco_management -f scripts/migrate-to-secure-tenants.sql
```

### Paso 2: Actualizar Variables de Entorno

Crear o actualizar tu archivo `.env`:

```bash
# CONFIGURACIÓN DE BASE DE DATOS SEGURA
DB_HOST=localhost
DB_PORT=5432
# ⚠️ CAMBIAR: No usar postgres o admin-cropco
DB_USERNAME=backend_cropco_user
DB_PASSWORD=cR0pc0_B4ck3nd_S3cur3!2024
DB_NAME=cropco_management

# SEGURIDAD
JWT_SECRET=tu_clave_jwt_muy_segura_aqui
# ⚠️ CRÍTICO: Generar clave única de 32+ caracteres
TENANT_ENCRYPTION_KEY=tu_clave_de_encriptacion_muy_segura_32_caracteres

# ESTADO DEL PROYECTO
STATUS_PROJECT=development
```

### Paso 3: Reiniciar Servicios

```bash
# 1. Detener servicios actuales
docker-compose -f docker-compose-db.yml down

# 2. Limpiar volúmenes si es necesario (⚠️ PERDERÁS DATOS)
# docker volume prune

# 3. Iniciar con nueva configuración
docker-compose -f docker-compose-db.yml up -d

# 4. Verificar logs
docker logs server-db
```

### Paso 4: Verificar Funcionamiento

```bash
# 1. Verificar conexión del backend
npm run test:unit

# 2. Verificar funcionalidad completa
npm run test:e2e

# 3. Probar creación de tenant (si aplica)
curl -X POST http://localhost:3000/tenants/create \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"test","company_name":"Test Company","email":"test@test.com"}'
```

## 🔍 Verificación de Seguridad

### Comprobar Usuarios de Base de Datos

```sql
-- Conectar como postgres
psql -U postgres

-- Listar usuarios y sus permisos
\du

-- Verificar que backend_cropco_user NO es superusuario
SELECT rolname, rolsuper, rolcreatedb 
FROM pg_roles 
WHERE rolname = 'backend_cropco_user';

-- Listar usuarios de tenants
SELECT rolname 
FROM pg_roles 
WHERE rolname LIKE 'tenant_%_user';
```

### Verificar Configuración de Tenants

```sql
-- Conectar a base de gestión
\c cropco_management

-- Verificar configuración de tenants
SELECT 
    t.subdomain,
    td.database_name,
    td.connection_config->>'username' as tenant_user,
    CASE 
        WHEN td.connection_config->>'password' LIKE '%:%:%' 
        THEN 'ENCRYPTED' 
        ELSE 'PLAIN_TEXT' 
    END as password_status
FROM tenants t
JOIN tenant_databases td ON t.id = td.tenant_id;
```

### Verificar Propiedad de Bases de Datos

```sql
-- Verificar que cada BD pertenece a su tenant
SELECT 
    datname,
    pg_get_userbyid(datdba) as owner
FROM pg_database 
WHERE datname LIKE 'cropco_tenant_%';
```

## ⚠️ Problemas Conocidos y Soluciones

### Error: "función create_tenant_user no existe"
**Causa**: No se ejecutó el script de configuración
**Solución**: 
```bash
psql -U postgres -f scripts/create-backend-user.sql
```

### Error: "TENANT_ENCRYPTION_KEY no definida"
**Causa**: Variable de entorno faltante
**Solución**: Agregar al archivo `.env`:
```bash
TENANT_ENCRYPTION_KEY=clave_segura_de_32_caracteres_minimo
```

### Error: "connection_config is null"
**Causa**: Tenants existentes sin migrar
**Solución**: Ejecutar migración manual:
```sql
SELECT migrate_existing_tenant_to_secure('subdomain_del_tenant');
```

### Error de permisos al crear tablas
**Causa**: Usuario del tenant sin permisos en schema public
**Solución**: Ya corregido en el script actualizado `create-backend-user.sql`

## 🎯 Validación Final

### Lista de Verificación de Seguridad

- [ ] ✅ Backend NO usa usuario `postgres` o `admin-cropco`
- [ ] ✅ Cada tenant tiene usuario dedicado
- [ ] ✅ Contraseñas de tenants están encriptadas
- [ ] ✅ Funciones de BD pertenecen al usuario del tenant
- [ ] ✅ Variable `TENANT_ENCRYPTION_KEY` está configurada
- [ ] ✅ Tests pasan correctamente
- [ ] ✅ Nuevos tenants se crean con usuarios dedicados
- [ ] ✅ Conexiones usan credenciales específicas por tenant

### Comando de Verificación Completa

```bash
# Script de verificación completa
npm run test:e2e && \
echo "✅ Tests pasados" && \
psql -U postgres -c "\du backend_cropco_user" && \
echo "✅ Usuario backend verificado" && \
psql -U backend_cropco_user -d cropco_management -c "SELECT 1" && \
echo "✅ Conexión backend funcional" && \
echo "🎉 ¡Migración de seguridad completada exitosamente!"
```

---

**⚠️ IMPORTANTE**: 
- Cambia todas las contraseñas de ejemplo en producción
- Genera una clave de encriptación única para cada entorno
- Documenta las credenciales de forma segura
- Programa rotación periódica de contraseñas

**🔒 RESULTADO**: Tu sistema ahora implementa el principio de mínimo privilegio y aislamiento completo entre tenants, eliminando las vulnerabilidades críticas identificadas. 