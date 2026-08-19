-- =============================================================================
-- RemoteDesk Enterprise - PostgreSQL Production Schema
-- Version: 1.0.0 (Phase 1: Backend & Database Foundation)
-- Compatible with: PostgreSQL 14+, 15+, 16+, 17+
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Admin', 'Technician', 'Customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('Baja', 'Media', 'Alta', 'Crítica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM (
        'Pendiente',
        'Asignado',
        'En progreso',
        'Esperando cliente',
        'Resuelto',
        'Cerrado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM (
        'Esperando técnico',
        'Técnico asignado',
        'Sesión autorizada',
        'Sesión activa',
        'Sesión finalizada',
        'Sesión revocada',
        'Rechazada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TABLE: Users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'Customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- 3. TABLE: Technicians
-- =============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL DEFAULT 'Soporte General',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    max_concurrent_sessions INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_online ON technicians(is_online);

-- =============================================================================
-- 4. TABLE: Customers
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =============================================================================
-- 5. TABLE: Devices
-- =============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    device_uuid VARCHAR(100) NOT NULL UNIQUE,
    computer_name VARCHAR(100) NOT NULL,
    windows_user VARCHAR(100) NOT NULL,
    os_version VARCHAR(150) NOT NULL,
    cpu VARCHAR(150) NOT NULL,
    ram_mb INT NOT NULL,
    storage_info VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    mac_address VARCHAR(50),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    agent_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_uuid ON devices(device_uuid);
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_devices_computer_name ON devices(computer_name);

-- =============================================================================
-- 6. TABLE: SupportTickets
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS ticket_seq START WITH 1000 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    problem_description TEXT NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'Media',
    status ticket_status NOT NULL DEFAULT 'Pendiente',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_device ON support_tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_technician ON support_tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- =============================================================================
-- 7. TABLE: RemoteSessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS remote_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    status session_status NOT NULL DEFAULT 'Esperando técnico',
    authorized_by_client BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT NOT NULL DEFAULT 0,
    quality_setting VARCHAR(20) NOT NULL DEFAULT 'Balanced',
    frame_rate INT NOT NULL DEFAULT 30,
    client_ip VARCHAR(45) NOT NULL,
    technician_ip VARCHAR(45) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remote_sessions_ticket ON remote_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_token ON remote_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_status ON remote_sessions(status);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_technician ON remote_sessions(technician_id);

-- =============================================================================
-- 8. TABLE: AuditLogs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- 9. Automatic Updated_At Trigger Function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_technicians_modtime BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_devices_modtime BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_support_tickets_modtime BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_remote_sessions_modtime BEFORE UPDATE ON remote_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
