-- 1. Crear la base de datos (Ejecutar esto primero en postgres database)
-- CREATE DATABASE terraai;

-- 2. Esquema de tablas y datos de prueba
-- El backend de NestJS generará las tablas automáticamente gracias a synchronize: true en app.module.ts
-- Pero aquí tienes el script SQL por si quieres prepararla manualmente:

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS azure_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    tenant_id VARCHAR NOT NULL,
    client_id VARCHAR NOT NULL,
    subscription_id VARCHAR NOT NULL,
    encrypted_client_secret TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    terraform_code TEXT NOT NULL,
    extracted_variables JSONB NOT NULL,
    resource_type VARCHAR NOT NULL,
    is_public BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos de prueba (Seed)
-- 1. Un usuario Mock (ID fijo para desarrollo)
INSERT INTO users (id, email, name, password_hash) 
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@terraai.com', 'Admin User', '$2b$10$xyz...')
ON CONFLICT (id) DO NOTHING;

-- 2. Un tenant de ejemplo (Secrets encriptados con 'default-secret-key-32-chars-long!!')
INSERT INTO azure_tenants (name, tenant_id, client_id, subscription_id, encrypted_client_secret, user_id)
VALUES ('Azure Production', 'tenant-idxxx', 'client-idxxx', 'subscription-idxxx', 'U2FsdGVkX19P1...', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- 3. Una plantilla básica
INSERT INTO templates (name, description, terraform_code, extracted_variables, resource_type, user_id)
VALUES (
    'Simple Storage Account', 
    'Crea un Storage Account estándar en Azure', 
    'resource "azurerm_storage_account" "example" { name = var.storage_name, resource_group_name = "rg-demo", location = "West US", account_tier = "Standard", account_replication_type = "LRS" }',
    '[{"name": "storage_name", "type": "string", "description": "Nombre de la storage account"}]',
    'azurerm_storage_account',
    '00000000-0000-0000-0000-000000000000'
) ON CONFLICT DO NOTHING;
