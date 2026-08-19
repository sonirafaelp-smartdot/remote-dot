import React, { useState } from 'react';
import {
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  Laptop,
  Shield,
  FileCheck,
  Plus,
  Search,
  ExternalLink,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  Briefcase,
  Edit,
  Trash2,
  X,
  Check,
  Save,
  CheckCircle2
} from 'lucide-react';

export interface ClientProfile {
  id: string;
  companyName: string;
  taxId: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  contractType: 'SLA_ORO_MENSUAL' | 'SLA_PLATA' | 'POR_EVENTO';
  monthlyFee: number;
  assignedTechnician: string;
  totalDevices: number;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  contractStart: string;
  notes: string;
}

const INITIAL_PROFILES: ClientProfile[] = [
  {
    id: 'cust-abc-01',
    companyName: 'ABC Solutions S.R.L.',
    taxId: '131-88992-1',
    contactPerson: 'Lic. Rafael Martínez (Gerente de TI)',
    email: 'contacto@abcsolutions.com',
    phone: '+1 (809) 555-0199',
    address: 'Av. Winston Churchill #109, Torre Empresarial Piantini, Sto. Dgo.',
    contractType: 'SLA_ORO_MENSUAL',
    monthlyFee: 750,
    assignedTechnician: 'Ing. Carlos Mendoza (Nivel 3)',
    totalDevices: 15,
    status: 'ACTIVE',
    contractStart: '2024-01-15',
    notes: 'Póliza integral: Asistencia remota ilimitada DOTDESK + 2 visitas técnicas presenciales mensuales.',
  },
  {
    id: 'cust-med-02',
    companyName: 'Centro Médico Moderno',
    taxId: '101-55443-9',
    contactPerson: 'Dra. Patricia Valdés (Administradora)',
    email: 'admin@centromedicorm.com',
    phone: '+1 (809) 555-0240',
    address: 'Calle Luis F. Thomén #45, Ensanche Quisqueya, Sto. Dgo.',
    contractType: 'SLA_ORO_MENSUAL',
    monthlyFee: 1200,
    assignedTechnician: 'Ing. Carlos Mendoza (Nivel 3)',
    totalDevices: 28,
    status: 'ACTIVE',
    contractStart: '2023-08-01',
    notes: 'Infraestructura médica crítica: Servidor PACS, Facturación ARS y Circuito Cerrado de Cámaras 24/7.',
  },
  {
    id: 'cust-log-03',
    companyName: 'Logística & Aduanas del Caribe',
    taxId: '132-00451-2',
    contactPerson: 'Marcos Herrera (Jefe de Operaciones)',
    email: 'mherrera@logisticadelcaribe.com',
    phone: '+1 (809) 555-0311',
    address: 'Zona Franca San Isidro, Nave B-4, Sto. Dgo. Este',
    contractType: 'SLA_PLATA',
    monthlyFee: 450,
    assignedTechnician: 'Téc. Laura Gómez (Nivel 2)',
    totalDevices: 8,
    status: 'ACTIVE',
    contractStart: '2025-02-10',
    notes: 'Monitoreo de terminales de pesaje y VPN segura para conexión con Aduanas.',
  },
];

export function DotCrmClientsView() {
  const [profiles, setProfiles] = useState<ClientProfile[]>(INITIAL_PROFILES);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(INITIAL_PROFILES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<ClientProfile>({
    id: '',
    companyName: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    contractType: 'SLA_ORO_MENSUAL',
    monthlyFee: 500,
    assignedTechnician: 'Ing. Carlos Mendoza (Nivel 3)',
    totalDevices: 10,
    status: 'ACTIVE',
    contractStart: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const filtered = profiles.filter(
    (p) =>
      p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.taxId.includes(searchQuery)
  );

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      id: `cust-${Date.now()}`,
      companyName: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      contractType: 'SLA_ORO_MENSUAL',
      monthlyFee: 500,
      assignedTechnician: 'Ing. Carlos Mendoza (Nivel 3)',
      totalDevices: 5,
      status: 'ACTIVE',
      contractStart: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (client: ClientProfile) => {
    setModalMode('edit');
    setFormData({ ...client });
    setShowModal(true);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      const updated = profiles.filter((p) => p.id !== clientId);
      setProfiles(updated);
      if (selectedClient?.id === clientId) {
        setSelectedClient(updated[0] || null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      const newClient = { ...formData, id: `cust-${Date.now()}` };
      setProfiles([newClient, ...profiles]);
      setSelectedClient(newClient);
    } else {
      const updated = profiles.map((p) => (p.id === formData.id ? formData : p));
      setProfiles(updated);
      setSelectedClient(formData);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  SMARTDOT CRM — Directorio & Perfiles de Clientes
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {profiles.length} Clientes Registrados
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Crea, edita y administra contratos de mantenimiento, información de contacto de gerentes y equipamiento bajo póliza.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Perfil de Cliente
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Clients Directory */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por empresa, contacto o RNC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                No se encontraron clientes con el criterio de búsqueda.
              </div>
            ) : (
              filtered.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500/60 shadow-lg shadow-blue-500/5'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-white truncate">{client.companyName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          client.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : client.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {client.status === 'ACTIVE' ? 'ACTIVO' : client.status === 'PENDING' ? 'PENDIENTE' : 'INACTIVO'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2 truncate">{client.contactPerson}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/60 pt-2">
                      <span>{client.totalDevices} PCs Conectadas</span>
                      <span className="text-blue-400 font-bold">${client.monthlyFee} USD/mes</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Client Detail Sheet */}
        <div className="lg:col-span-7">
          {selectedClient ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl relative">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedClient.companyName}</h2>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">RNC / Tax ID: {selectedClient.taxId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedClient)}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar Cliente
                  </button>
                  <button
                    onClick={() => handleDeleteClient(selectedClient.id)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition"
                    title="Eliminar Cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-mono">
                    Contacto Principal
                  </div>
                  <div className="font-bold text-white text-sm">{selectedClient.contactPerson}</div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>{selectedClient.phone || 'No especificado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>{selectedClient.email || 'No especificado'}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-mono">
                    Póliza de Servicio IT
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    ${selectedClient.monthlyFee} USD <span className="text-xs font-normal text-slate-400">/ mes</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedClient.totalDevices} Equipos bajo soporte</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedClient.assignedTechnician}</span>
                  </div>
                </div>
              </div>

              {/* Physical Location */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> Ubicación de las Oficinas
                </div>
                <div className="text-slate-200">{selectedClient.address || 'Sin dirección registrada'}</div>
              </div>

              {/* SLA & Service Scope Notes */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-400" /> Alcance del Contrato & Observaciones
                </div>
                <p className="text-slate-300 leading-relaxed">{selectedClient.notes || 'Sin notas especiales registradas.'}</p>
              </div>

              <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800 flex justify-between">
                <span>Inicio de Contrato: {selectedClient.contractStart}</span>
                <span>Tipo: {selectedClient.contractType}</span>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-xs">
              Selecciona un cliente del directorio para visualizar o editar.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  {modalMode === 'create' ? 'Registrar Nuevo Cliente' : 'Editar Perfil de Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Nombre de la Empresa / Cliente:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ABC Solutions S.R.L."
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">RNC / CIF / Identificación Fiscal:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 131-88992-1"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Persona de Contacto / Cargo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Rafael Martínez (TI)"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Teléfono / Celular:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. +1 (809) 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Dirección de Oficinas:</label>
                  <input
                    type="text"
                    placeholder="Av. Winston Churchill #109..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Tipo de Póliza / Contrato:</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                  >
                    <option value="SLA_ORO_MENSUAL">SLA Oro Mensual</option>
                    <option value="SLA_PLATA">SLA Plata</option>
                    <option value="POR_EVENTO">Por Evento / Demanda</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Tarifa Mensual ($ USD):</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Equipos Bajo Soporte:</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalDevices}
                    onChange={(e) => setFormData({ ...formData, totalDevices: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">Técnico Principal Asignado:</label>
                <input
                  type="text"
                  value={formData.assignedTechnician}
                  onChange={(e) => setFormData({ ...formData, assignedTechnician: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">Notas / Alcance del Contrato:</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalles sobre infraestructura, servidores, horarios de atención preferenciales..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {modalMode === 'create' ? 'Guardar Cliente' : 'Actualizar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
