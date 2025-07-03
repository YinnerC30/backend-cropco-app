-- Script para crear usuario de backend con privilegios limitados
-- Ejecutar como superusuario (postgres)

-- 1. Crear rol para el backend
CREATE ROLE backend_cropco_user WITH LOGIN PASSWORD 'cR0pc0_B4ck3nd_S3cur3!2024';

-- 2. Otorgar solo permisos necesarios
-- ALTER ROLE backend_cropco_user CREATEDB;  -- Para crear bases de datos de tenants
ALTER ROLE backend_cropco_user CREATEROLE CREATEDB;

-- 3. Crear rol base para tenants
CREATE ROLE tenant_base_role;

-- 4. Otorgar permisos básicos al rol base
GRANT CONNECT ON DATABASE postgres TO tenant_base_role;
GRANT USAGE ON SCHEMA public TO tenant_base_role;

-- Otorgar privilegios completos sobre la base de datos cropco_management al rol backend_cropco_user
GRANT ALL PRIVILEGES ON DATABASE cropco_management TO backend_cropco_user;

-- Conectarse a la base de datos cropco_management para otorgar permisos sobre esquemas y objetos
\c cropco_management

-- Otorgar todos los privilegios sobre el esquema public
GRANT ALL ON SCHEMA public TO backend_cropco_user;

-- Otorgar todos los privilegios sobre todas las tablas existentes y futuras en el esquema public
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO backend_cropco_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO backend_cropco_user;

-- Otorgar todos los privilegios sobre todas las secuencias existentes y futuras en el esquema public
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO backend_cropco_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO backend_cropco_user;

-- Otorgar todos los privilegios sobre todas las funciones existentes y futuras en el esquema public
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO backend_cropco_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO backend_cropco_user;


-- 5. Función para crear usuario de tenant
CREATE OR REPLACE FUNCTION create_tenant_user(tenant_name TEXT, tenant_password TEXT)
RETURNS TEXT AS $$
DECLARE
    tenant_user_name TEXT;
BEGIN
    tenant_user_name := 'tenant_' || tenant_name || '_user';
    
    -- Verificar si el usuario ya existe
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = tenant_user_name) THEN
        RAISE NOTICE 'Usuario % ya existe, saltando creación', tenant_user_name;
        RETURN tenant_user_name;
    END IF;
    
    -- Crear usuario específico para el tenant
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', tenant_user_name, tenant_password);
    
    -- Heredar permisos base
    EXECUTE format('GRANT tenant_base_role TO %I', tenant_user_name);
    
    -- Otorgar permisos específicos para la base de datos del tenant
    EXECUTE format('GRANT CREATE ON SCHEMA public TO %I', tenant_user_name);
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', tenant_user_name);
    
    RETURN tenant_user_name;
END;
$$ LANGUAGE plpgsql;

-- 6. Otorgar permisos de ejecución al backend
GRANT EXECUTE ON FUNCTION create_tenant_user(TEXT, TEXT) TO backend_cropco_user;

-- 7. Revocar permisos innecesarios
REVOKE ALL ON SCHEMA information_schema FROM backend_cropco_user;
REVOKE ALL ON SCHEMA pg_catalog FROM backend_cropco_user; 