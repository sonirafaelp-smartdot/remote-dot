import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  Code2, 
  FileCode, 
  RefreshCw, 
  Users, 
  Cpu, 
  Building2, 
  Laptop, 
  Ticket, 
  MonitorPlay, 
  ShieldAlert,
  Search,
  CheckCircle
} from 'lucide-react';

export const DatabaseExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tables' | 'sql-schema' | 'csharp-models'>('tables');
  const [selectedTable, setSelectedTable] = useState<string>('devices');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tables = [
    { id: 'users', label: 'users', count: 3, icon: Users, desc: 'Cuentas de usuario y roles de acceso' },
    { id: 'technicians', label: 'technicians', count: 2, icon: Cpu, desc: 'Perfiles técnicos y especialidades' },
    { id: 'customers', label: 'customers', count: 2, icon: Building2, desc: 'Empresas clientes y contactos' },
    { id: 'devices', label: 'devices', count: 3, icon: Laptop, desc: 'Computadoras Windows y telemetría HWID' },
    { id: 'tickets', label: 'support_tickets', count: 2, icon: Ticket, desc: 'Tickets de soporte y prioridades' },
    { id: 'sessions', label: 'remote_sessions', count: 1, icon: MonitorPlay, desc: 'Sesiones remotas autorizadas y tokens' },
    { id: 'audit', label: 'audit_logs', count: 2, icon: ShieldAlert, desc: 'Registro de auditoría y seguridad' },
  ];

  const fetchTableData = async (table: string) => {
    setLoading(true);
    try {
      let endpoint = `/api/v1/${table}`;
      if (table === 'users') endpoint = '/api/v1/auth/users';
      if (table === 'technicians') endpoint = '/api/v1/auth/users';
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setTableData(Array.isArray(json) ? json : [json]);
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  const filteredData = tableData.filter((item) => {
    if (!searchQuery) return true;
    return JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              POSTGRESQL 16 / EF CORE
            </span>
            <span className="text-xs text-slate-400">FASE 1: Capa de Datos & Modelo Relacional</span>
          </div>
          <h2 className="text-xl font-bold text-white">Explorador de Base de Datos</h2>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'tables' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Tablas Activas
          </button>
          <button
            onClick={() => setActiveTab('sql-schema')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql-schema' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Script SQL DDL
          </button>
          <button
            onClick={() => setActiveTab('csharp-models')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'csharp-models' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            C# ASP.NET DbContext
          </button>
        </div>
      </div>

      {/* Main View */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Table List (Left) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Tablas del Sistema ({tables.length})
            </div>
            {tables.map((tbl) => {
              const Icon = tbl.icon;
              const isSelected = selectedTable === tbl.id;
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedTable(tbl.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-950/50 border-sky-500/50 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${isSelected ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-200">{tbl.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{tbl.desc}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Live
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Records Inspector (Right) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono text-base font-bold text-white">
                  SELECT * FROM {selectedTable}
                </h3>
                <span className="text-xs text-slate-400">({filteredData.length} registros)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrar registros..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  onClick={() => fetchTableData(selectedTable)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  title="Recargar datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto max-h-[500px] border border-slate-800 rounded-lg">
              {filteredData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No hay registros disponibles o no coinciden con la búsqueda.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      {Object.keys(filteredData[0] || {}).map((key) => (
                        <th key={key} className="py-2.5 px-3 font-semibold whitespace-nowrap text-sky-400">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        {Object.values(row).map((val: any, colIdx) => (
                          <td key={colIdx} className="py-2 px-3 whitespace-nowrap max-w-[240px] truncate">
                            {typeof val === 'object' && val !== null ? (
                              <span className="text-amber-300/90">{JSON.stringify(val)}</span>
                            ) : typeof val === 'boolean' ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${val ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {val ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : (
                              String(val ?? 'NULL')
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SQL Schema View */}
      {activeTab === 'sql-schema' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                Script DDL para PostgreSQL (backend/database/schema.sql)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Crea extensiones UUID, Enums, 7 tablas relacionales, índices y disparadores de actualización automática.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
              PostgreSQL 14+ / 16+
            </span>
          </div>
          <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed">
{`-- RemoteDesk Enterprise - PostgreSQL Production Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('Admin', 'Technician', 'Customer');
CREATE TYPE ticket_priority AS ENUM ('Baja', 'Media', 'Alta', 'Crítica');
CREATE TYPE ticket_status AS ENUM ('Pendiente', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado');
CREATE TYPE session_status AS ENUM ('Esperando técnico', 'Técnico asignado', 'Sesión autorizada', 'Sesión activa', 'Sesión finalizada', 'Sesión revocada', 'Rechazada');

-- 1. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'Customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Technicians
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL DEFAULT 'Soporte General',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    max_concurrent_sessions INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers
CREATE TABLE customers (
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

-- 4. Devices
CREATE TABLE devices (
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

-- 5. SupportTickets
CREATE TABLE support_tickets (
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

-- 6. RemoteSessions
CREATE TABLE remote_sessions (
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

-- 7. AuditLogs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`}
          </pre>
        </div>
      )}

      {/* C# EF Core View */}
      {activeTab === 'csharp-models' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Modelos C# Entity Framework Core 8 (.NET 9)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ubicación: <code className="text-sky-400">backend/models_csharp/RemoteDeskDbContext.cs</code>
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
              .NET 8 / EF Core
            </span>
          </div>
          <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed">
{`namespace RemoteDesk.Server.Data
{
    public class RemoteDeskDbContext : DbContext
    {
        public RemoteDeskDbContext(DbContextOptions<RemoteDeskDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Technician> Technicians => Set<Technician>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Device> Devices => Set<Device>();
        public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
        public DbSet<RemoteSession> RemoteSessions => Set<RemoteSession>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    }
    // Entidades con Data Annotations, Foreign Keys y Fluent API configuradas...
}`}
          </pre>
        </div>
      )}
    </div>
  );
};
