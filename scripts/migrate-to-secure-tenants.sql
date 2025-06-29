-- Script de migración para convertir tenants existentes al nuevo sistema de seguridad
-- Ejecutar después de aplicar create-backend-user.sql

-- 1. Función temporal para migrar tenants existentes
CREATE OR REPLACE FUNCTION migrate_existing_tenant_to_secure(tenant_subdomain TEXT)
RETURNS TEXT AS $$
DECLARE
    tenant_db_name TEXT;
    tenant_user_name TEXT;
    tenant_password TEXT;
    connection_config JSONB;
    tenant_db_id UUID;
BEGIN
    -- Generar nombre de base de datos
    tenant_db_name := 'cropco_tenant_' || tenant_subdomain;
    tenant_user_name := 'tenant_' || tenant_subdomain || '_user';
    
    -- Generar contraseña segura (en un caso real, esto se haría desde el backend)
    tenant_password := encode(gen_random_bytes(16), 'base64');
    
    -- Verificar que la base de datos existe
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = tenant_db_name) THEN
        RAISE EXCEPTION 'Base de datos % no existe', tenant_db_name;
    END IF;
    
    -- Crear usuario para el tenant
    SELECT create_tenant_user(tenant_subdomain, tenant_password) INTO tenant_user_name;
    
    -- Asignar propiedad de la base de datos al nuevo usuario
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', tenant_db_name, tenant_user_name);
    
    -- Obtener ID de la configuración de base de datos del tenant
    SELECT td.id INTO tenant_db_id 
    FROM tenant_databases td 
    JOIN tenants t ON td.tenant_id = t.id 
    WHERE t.subdomain = tenant_subdomain;
    
    -- Actualizar configuración con credenciales encriptadas
    -- NOTA: En producción, la encriptación debe hacerse desde el backend
    connection_config := jsonb_build_object(
        'username', tenant_user_name,
        'password', 'ENCRYPTED_PASSWORD_PLACEHOLDER', -- Esto debe ser encriptado por el backend
        'host', 'localhost',
        'port', 5432
    );
    
    UPDATE tenant_databases 
    SET connection_config = connection_config 
    WHERE id = tenant_db_id;
    
    RAISE NOTICE 'Tenant % migrado exitosamente. Usuario: %, Password: %', 
                 tenant_subdomain, tenant_user_name, tenant_password;
    
    RETURN format('Usuario creado: %s, Password temporal: %s', tenant_user_name, tenant_password);
END;
$$ LANGUAGE plpgsql;

-- 2. Función para listar tenants que necesitan migración
CREATE OR REPLACE FUNCTION list_tenants_needing_migration()
RETURNS TABLE(subdomain TEXT, database_name TEXT, has_secure_config BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.subdomain,
        td.database_name,
        (td.connection_config->>'username' IS NOT NULL) as has_secure_config
    FROM tenants t
    JOIN tenant_databases td ON t.id = td.tenant_id
    WHERE t.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 3. Instrucciones de uso
/*
Para usar este script de migración:

1. Primero, lista los tenants que necesitan migración:
   SELECT * FROM list_tenants_needing_migration();

2. Para cada tenant que no tenga configuración segura, ejecuta:
   SELECT migrate_existing_tenant_to_secure('subdomain_del_tenant');

3. Anota las contraseñas temporales generadas

4. Desde el backend de Node.js, actualiza las contraseñas encriptadas:
   - Usa el método encryptPassword() del TenantsService
   - Actualiza el campo connection_config en tenant_databases

5. Limpia las funciones temporales:
   DROP FUNCTION IF EXISTS migrate_existing_tenant_to_secure(TEXT);
   DROP FUNCTION IF EXISTS list_tenants_needing_migration();

EJEMPLO DE USO:
-- Listar tenants
SELECT * FROM list_tenants_needing_migration();

-- Migrar un tenant específico
SELECT migrate_existing_tenant_to_secure('mi_tenant');

-- Verificar migración
SELECT subdomain, database_name, connection_config 
FROM tenants t 
JOIN tenant_databases td ON t.id = td.tenant_id 
WHERE t.subdomain = 'mi_tenant';
*/ 