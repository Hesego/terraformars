-- =====================================================================
-- TerraFormars - Definición completa de la base de datos (PostgreSQL 15)
-- Fuente: modelo-terraformars.pdf + entidades TypeORM (backend/src/entities)
--
-- Uso:
--   1) CREATE DATABASE terraai;   -- (nombre definido en DB_DATABASE)
--   2) psql -U postgres -d terraai -f database/terraformars_schema.sql
-- =====================================================================

BEGIN;

-- gen_random_uuid() es nativo desde PG13; se deja la extensión por compatibilidad
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos ENUM
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE deployment_status AS ENUM ('pending', 'running', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE script_language AS ENUM ('bash', 'powershell');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE script_execution_status AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR      NOT NULL UNIQUE,
    name          VARCHAR      NOT NULL,
    password_hash VARCHAR      NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- azure_tenants
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS azure_tenants (
    id                      UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR   NOT NULL,
    tenant_id               VARCHAR   NOT NULL,
    client_id               VARCHAR   NOT NULL,
    subscription_id         VARCHAR   NOT NULL,
    encrypted_client_secret TEXT      NOT NULL,
    user_id                 UUID      NOT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_azure_tenants_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ---------------------------------------------------------------------
-- templates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR        NOT NULL,
    description         TEXT,
    terraform_code      TEXT           NOT NULL,
    extracted_variables JSONB          NOT NULL,
    scalable_attributes JSONB,
    resource_type       VARCHAR        NOT NULL,
    category            VARCHAR,
    is_public           BOOLEAN        NOT NULL DEFAULT false,
    estimated_cost      DECIMAL(10, 2),
    user_id             UUID           NOT NULL,
    created_at          TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ---------------------------------------------------------------------
-- deployments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deployments (
    id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    parameters          JSONB             NOT NULL,
    script_ids          JSONB,
    resources_inventory JSONB,
    status              deployment_status NOT NULL DEFAULT 'pending',
    logs                TEXT,
    user_id             UUID              NOT NULL,
    template_id         UUID              NOT NULL,
    tenant_id           UUID              NOT NULL,
    created_at          TIMESTAMP         NOT NULL DEFAULT now(),
    finished_at         TIMESTAMP,
    CONSTRAINT fk_deployments_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_deployments_template FOREIGN KEY (template_id) REFERENCES templates (id),
    CONSTRAINT fk_deployments_tenant   FOREIGN KEY (tenant_id)   REFERENCES azure_tenants (id)
);

-- ---------------------------------------------------------------------
-- scripts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scripts (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR         NOT NULL,
    description TEXT,
    content     TEXT            NOT NULL,
    language    script_language NOT NULL DEFAULT 'bash',
    category    VARCHAR,
    user_id     UUID            NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_scripts_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ---------------------------------------------------------------------
-- script_executions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS script_executions (
    id            UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID,
    tenant_id     UUID,
    script_id     UUID                    NOT NULL,
    resource_id   VARCHAR,
    status        script_execution_status NOT NULL DEFAULT 'pending',
    logs          TEXT,
    job_id        VARCHAR,
    started_at    TIMESTAMP               NOT NULL DEFAULT now(),
    finished_at   TIMESTAMP,
    CONSTRAINT fk_script_executions_deployment FOREIGN KEY (deployment_id) REFERENCES deployments (id)   ON DELETE CASCADE,
    CONSTRAINT fk_script_executions_tenant     FOREIGN KEY (tenant_id)     REFERENCES azure_tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_script_executions_script     FOREIGN KEY (script_id)     REFERENCES scripts (id)       ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Índices sobre llaves foráneas
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_azure_tenants_user_id          ON azure_tenants (user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id              ON templates (user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id            ON deployments (user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_template_id        ON deployments (template_id);
CREATE INDEX IF NOT EXISTS idx_deployments_tenant_id          ON deployments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_id                ON scripts (user_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_deployment_id ON script_executions (deployment_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_tenant_id    ON script_executions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_script_id    ON script_executions (script_id);

COMMIT;
