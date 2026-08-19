import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  User, 
  Laptop, 
  Building2, 
  Phone, 
  Mail, 
  Send, 
  Lock, 
  Unlock, 
  RefreshCw, 
  ArrowRight, 
  ChevronRight, 
  ShieldAlert, 
  BarChart3, 
  Kanban, 
  ListFilter, 
  Code, 
  Copy, 
  Check, 
  SlidersHorizontal, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Layers,
  FileSpreadsheet,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { 
  SupportTicket, 
  TicketPriority, 
  TicketStatus, 
  TicketCategory, 
  TicketStats, 
  TicketComment 
} from '../types.ts';

export function TicketSystemView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'stats' | 'csharp'>('list');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [technicianFilter, setTechnicianFilter] = useState<string>('ALL');

  // New Ticket Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTicketForm, setNewTicketForm] = useState({
    customerId: '',
    deviceId: '',
    contactName: '',
    contactInfo: '',
    category: TicketCategory.SOFTWARE_ERP,
    priority: TicketPriority.MEDIUM,
    problemDescription: '',
  });

  // New Comment Form
  const [commentText, setCommentText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Resolve Modal / Form
  const [resolutionText, setResolutionText] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Reference data for dropdowns
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [techniciansList, setTechniciansList] = useState<any[]>([]);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const fetchTicketsAndData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, statsRes, devRes, custRes, techRes] = await Promise.all([
        fetch('/api/v1/tickets'),
        fetch('/api/v1/tickets/stats'),
        fetch('/api/v1/devices'),
        fetch('/api/v1/customers'),
        fetch('/api/v1/technicians'),
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data);
        if (!selectedTicketId && data.length > 0) {
          setSelectedTicketId(data[0].id);
        }
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (devRes.ok) setDevicesList(await devRes.json());
      if (custRes.ok) setCustomersList(await custRes.json());
      if (techRes.ok) setTechniciansList(await techRes.json());
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsAndData();
    const interval = setInterval(fetchTicketsAndData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.problemDescription.trim()) return;

    try {
      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: newTicketForm.customerId || undefined,
          device_id: newTicketForm.deviceId || undefined,
          contact_name: newTicketForm.contactName,
          contact_info: newTicketForm.contactInfo,
          category: newTicketForm.category,
          priority: newTicketForm.priority,
          problem_description: newTicketForm.problemDescription,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        setNewTicketForm({
          customerId: '',
          deviceId: '',
          contactName: '',
          contactInfo: '',
          category: TicketCategory.SOFTWARE_ERP,
          priority: TicketPriority.MEDIUM,
          problemDescription: '',
        });
        await fetchTicketsAndData();
        setSelectedTicketId(created.id);
      }
    } catch (e) {
      console.error('Error creating ticket:', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !commentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/v1/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: 'Ing. Roberto Ramírez',
          author_role: 'Technician',
          author_id: 'tech-001',
          message: commentText.trim(),
          is_internal_note: isInternalNote,
        }),
      });

      if (res.ok) {
        setCommentText('');
        setIsInternalNote(false);
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error adding comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAssignTechnician = async (ticketId: string, technicianId: string) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: technicianId }),
      });
      if (res.ok) {
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error assigning technician:', e);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_notes: resolutionText.trim() || 'Incidencia atendida y resuelta satisfactoriamente.',
        }),
      });
      if (res.ok) {
        setShowResolveModal(false);
        setResolutionText('');
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error resolving ticket:', e);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Conformidad de servicio recibida por el usuario.' }),
      });
      if (res.ok) {
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error closing ticket:', e);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'El usuario reportó que el síntoma se presentó nuevamente.' }),
      });
      if (res.ok) {
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error reopening ticket:', e);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTicketsAndData();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const exportTicketsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `remotedesk_tickets_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (customerFilter !== 'ALL' && t.customer_id !== customerFilter) return false;
    if (technicianFilter !== 'ALL' && t.technician_id !== technicianFilter) return false;

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      const matchNumber = t.ticket_number.toLowerCase().includes(term);
      const matchDesc = t.problem_description.toLowerCase().includes(term);
      const matchContact = t.contact_name?.toLowerCase().includes(term);
      const matchCustomer = t.customer?.company_name.toLowerCase().includes(term);
      const matchPc = t.device?.computer_name.toLowerCase().includes(term);
      return matchNumber || matchDesc || matchContact || matchCustomer || matchPc;
    }
    return true;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.CRITICAL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Crítica (2h SLA)
          </span>
        );
      case TicketPriority.HIGH:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Alta (6h SLA)
          </span>
        );
      case TicketPriority.MEDIUM:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <Clock className="w-3 h-3 text-sky-400" />
            Media (24h SLA)
          </span>
        );
      case TicketPriority.LOW:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            Baja (48h SLA)
          </span>
        );
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Pendiente
          </span>
        );
      case TicketStatus.ASSIGNED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
            <User className="w-3 h-3" />
            Asignado
          </span>
        );
      case TicketStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
            En Progreso
          </span>
        );
      case TicketStatus.WAITING_CUSTOMER:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Clock className="w-3 h-3 text-purple-400" />
            Esperando Cliente
          </span>
        );
      case TicketStatus.RESOLVED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Resuelto
          </span>
        );
      case TicketStatus.CLOSED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600">
            <Lock className="w-3 h-3" />
            Cerrado
          </span>
        );
      default:
        return null;
    }
  };

  const getSlaTimeRemaining = (slaDueAt?: string) => {
    if (!slaDueAt) return null;
    const now = new Date().getTime();
    const due = new Date(slaDueAt).getTime();
    const diffMs = due - now;

    if (diffMs < 0) {
      const hoursOver = Math.abs(Math.round(diffMs / 3600000));
      return (
        <span className="text-rose-400 font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> SLA Vencido ({hoursOver}h)
        </span>
      );
    }
    const hoursRemaining = Math.floor(diffMs / 3600000);
    const minsRemaining = Math.floor((diffMs % 3600000) / 60000);

    if (hoursRemaining < 2) {
      return (
        <span className="text-amber-400 font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3" /> {hoursRemaining}h {minsRemaining}m restantes
        </span>
      );
    }
    return (
      <span className="text-slate-400 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {hoursRemaining}h {minsRemaining}m restantes
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                FASE 5 COMPLETA
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                Helpdesk & SLA Engine Activo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Ticket className="w-6 h-6 text-sky-400" />
              Gestión Integral de Tickets de Soporte
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Generador automático de identificadores, cálculo de SLA por niveles de prioridad, notas internas técnicas, comentarios para el cliente y asignación de especialistas en un solo clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportTicketsJson}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Reporte</span>
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ticket de Soporte</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">Total Tickets</div>
            <div className="text-xl font-bold text-white mt-1">{stats?.total ?? tickets.length}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pendientes
            </div>
            <div className="text-xl font-bold text-amber-300 mt-1">{stats?.pending ?? 0}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              En Progreso
            </div>
            <div className="text-xl font-bold text-indigo-300 mt-1">{stats?.in_progress ?? 0}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Críticos Abiertos
            </div>
            <div className="text-xl font-bold text-rose-300 mt-1">{stats?.critical_open ?? 0}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Resueltos / Cerrados
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {(stats?.resolved ?? 0) + (stats?.closed ?? 0)}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-sky-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Cumplimiento SLA
            </div>
            <div className="text-xl font-bold text-sky-300 mt-1">
              {stats?.sla_compliance_pct ?? 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Lista & Detalle</span>
          </button>

          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'kanban'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tablero Kanban</span>
          </button>

          <button
            onClick={() => setViewMode('stats')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'stats'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Métricas SLA</span>
          </button>

          <button
            onClick={() => setViewMode('csharp')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'csharp'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Servicio C# (.NET 9)</span>
          </button>
        </div>

        {/* Quick Refresh */}
        <button
          onClick={fetchTicketsAndData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* VIEW MODE 1: LIST & DETAIL SPLIT */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filters + Ticket Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por #TICK, cliente, PC o fallo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Estado</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ALL">Todos los estados</option>
                    {Object.values(TicketStatus).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Prioridad</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ALL">Todas las prioridades</option>
                    {Object.values(TicketPriority).map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Ticket Cards List */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No se encontraron tickets con los filtros actuales.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-800/90 border-sky-500/60 shadow-lg shadow-sky-500/5'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {t.ticket_number}
                          </span>
                          {getStatusBadge(t.status)}
                        </div>
                        {getPriorityBadge(t.priority)}
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 mb-2">
                        {t.problem_description}
                      </h4>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{t.customer?.company_name || 'Cliente'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Laptop className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{t.device?.computer_name || 'PC'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                        <span>{new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {getSlaTimeRemaining(t.sla_due_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Ticket Full Detail & Workflow (7 cols) */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-mono font-bold text-sky-400">
                        {selectedTicket.ticket_number}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Categoría: <span className="text-slate-300 font-semibold">{selectedTicket.category || 'General'}</span>
                    </div>
                  </div>

                  {/* Actions (Resolve / Close / Reopen) */}
                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== TicketStatus.RESOLVED && selectedTicket.status !== TicketStatus.CLOSED && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                    )}

                    {selectedTicket.status === TicketStatus.RESOLVED && (
                      <button
                        onClick={() => handleCloseTicket(selectedTicket.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Cerrar Ticket</span>
                      </button>
                    )}

                    {(selectedTicket.status === TicketStatus.RESOLVED || selectedTicket.status === TicketStatus.CLOSED) && (
                      <button
                        onClick={() => handleReopenTicket(selectedTicket.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reabrir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Problem Description Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Descripción del Problema Reportado
                  </div>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.problem_description}
                  </p>
                </div>

                {/* Info Grid: Customer, Device, Technician & SLA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      Cliente & Contacto
                    </div>
                    <div className="font-semibold text-slate-200">
                      {selectedTicket.customer?.company_name || 'Empresa No Asignada'}
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedTicket.contact_name || selectedTicket.customer?.contact_name || 'N/A'}
                    </div>
                    {selectedTicket.contact_info && (
                      <div className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedTicket.contact_info}
                      </div>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                      Equipo / Terminal Remota
                    </div>
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{selectedTicket.device?.computer_name || 'PC Remota'}</span>
                      {selectedTicket.device?.is_online ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="En línea" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600" title="Desconectado" />
                      )}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Usuario: {selectedTicket.device?.windows_user || 'N/A'}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      IP: {selectedTicket.device?.ip_address || '127.0.0.1'} ({selectedTicket.device?.os_version || 'Windows'})
                    </div>
                  </div>

                  {/* Technician Assignment */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      Especialista Asignado
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={selectedTicket.technician_id || ''}
                        onChange={(e) => handleAssignTechnician(selectedTicket.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-full"
                      >
                        <option value="">Sin Técnico Asignado</option>
                        {techniciansList.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.user?.full_name || tech.id} ({tech.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SLA & Time Tracking */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Acuerdo de Nivel de Servicio (SLA)
                    </div>
                    <div className="text-xs font-mono">
                      {getSlaTimeRemaining(selectedTicket.sla_due_at)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Creado: {new Date(selectedTicket.created_at).toLocaleString()}
                    </div>
                    {selectedTicket.resolved_at && (
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Resuelto: {new Date(selectedTicket.resolved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Notes If Resolved */}
                {selectedTicket.resolution_notes && (
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Notas de Resolución Técnica
                    </div>
                    <p className="text-xs text-emerald-100/90 whitespace-pre-wrap leading-relaxed font-mono">
                      {selectedTicket.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Comments & Technical Notes Timeline */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                      Historial de Conversación y Notas Internas ({selectedTicket.comments?.length || 0})
                    </h4>
                  </div>

                  {/* Comments Feed */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
                        No hay comentarios ni notas registradas en este ticket.
                      </div>
                    ) : (
                      selectedTicket.comments.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            c.is_internal_note
                              ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                              : 'bg-slate-950/80 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{c.author_name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                {c.author_role}
                              </span>
                              {c.is_internal_note && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  Nota Técnica Interna
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
                            {c.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input Form */}
                  <form onSubmit={handleAddComment} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <textarea
                      rows={2}
                      placeholder={isInternalNote ? "Escribir nota técnica interna (solo visible para técnicos)..." : "Escribir respuesta o mensaje para el cliente..."}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                        />
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Marcar como Nota Interna Privada
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={submittingComment || !commentText.trim()}
                        className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publicar</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
                Seleccione un ticket de la lista para ver su detalle.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {[
            { status: TicketStatus.PENDING, title: 'Pendientes', color: 'border-amber-500/40 bg-amber-950/10' },
            { status: TicketStatus.ASSIGNED, title: 'Asignados', color: 'border-red-500/40 bg-red-950/10' },
            { status: TicketStatus.IN_PROGRESS, title: 'En Progreso', color: 'border-indigo-500/40 bg-indigo-950/10' },
            { status: TicketStatus.WAITING_CUSTOMER, title: 'Esperando Cliente', color: 'border-purple-500/40 bg-purple-950/10' },
            { status: TicketStatus.RESOLVED, title: 'Resueltos', color: 'border-emerald-500/40 bg-emerald-950/10' },
          ].map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className={`p-4 rounded-2xl border ${col.color} space-y-3 flex flex-col min-h-[500px]`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setViewMode('list');
                      }}
                      className="p-3 bg-slate-900/90 hover:bg-slate-850 rounded-xl border border-slate-800 cursor-pointer transition-all hover:border-slate-700 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-sky-400">{t.ticket_number}</span>
                        {getPriorityBadge(t.priority)}
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2 font-medium">
                        {t.problem_description}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="truncate max-w-[120px]">{t.customer?.company_name || 'Cliente'}</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: STATS & ANALYTICS */}
      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Distribution */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Distribución por Nivel de Prioridad
            </h3>
            <div className="space-y-3">
              {Object.values(TicketPriority).map((p) => {
                const count = stats?.by_priority?.[p] || tickets.filter((t) => t.priority === p).length;
                const total = tickets.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{p}</span>
                      <span className="text-slate-400">{count} tickets ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          p === TicketPriority.CRITICAL
                            ? 'bg-rose-500'
                            : p === TicketPriority.HIGH
                            ? 'bg-amber-500'
                            : p === TicketPriority.MEDIUM
                            ? 'bg-sky-500'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Distribución por Categoría de Incidencia
            </h3>
            <div className="space-y-2.5">
              {Object.values(TicketCategory).map((cat) => {
                const count = stats?.by_category?.[cat] || tickets.filter((t) => t.category === cat).length;
                return (
                  <div key={cat} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-slate-300">{cat}</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 4: C# CODE (.NET 9 SERVICE) */}
      {viewMode === 'csharp' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                TicketManagementService.cs (.NET 9 / C#)
              </h3>
              <p className="text-xs text-slate-400">
                Servicio backend y de agente para gestión de ciclo de vida de tickets, cálculo de SLA y notas técnicas.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`// TicketManagementService.cs C# .NET 9`);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado' : 'Copiar C#'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[500px]">
{`using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace RemoteDesk.Enterprise.Tickets
{
    public enum TicketPriority { Baja = 1, Media = 2, Alta = 3, Critica = 4 }
    public enum TicketStatus { Pendiente = 0, Asignado = 1, EnProgreso = 2, EsperandoCliente = 3, Resuelto = 4, Cerrado = 5 }

    public class SupportTicketModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string TicketNumber { get; set; } = string.Empty; // TICK-000125
        public string CustomerId { get; set; } = string.Empty;
        public string DeviceId { get; set; } = string.Empty;
        public string ProblemDescription { get; set; } = string.Empty;
        public TicketPriority Priority { get; set; } = TicketPriority.Media;
        public TicketStatus Status { get; set; } = TicketStatus.Pendiente;
        public DateTime SlaDueAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class TicketManagementService
    {
        private static long _ticketSequence = 1000;
        
        public static string GenerateTicketNumber()
        {
            var next = Interlocked.Increment(ref _ticketSequence);
            return $"TICK-{next:D6}";
        }

        public static DateTime CalculateSlaDueDate(TicketPriority priority) => priority switch
        {
            TicketPriority.Critica => DateTime.UtcNow.AddHours(2),
            TicketPriority.Alta => DateTime.UtcNow.AddHours(6),
            TicketPriority.Media => DateTime.UtcNow.AddHours(24),
            TicketPriority.Baja => DateTime.UtcNow.AddHours(48),
            _ => DateTime.UtcNow.AddHours(24)
        };
    }
}`}
          </pre>
        </div>
      )}

      {/* MODAL: NUEVO TICKET DE SOPORTE */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-sky-400" />
                Crear Nuevo Ticket de Soporte
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Cliente / Empresa
                </label>
                <select
                  value={newTicketForm.customerId}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, customerId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Seleccionar Empresa...</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Dispositivo / Computadora
                </label>
                <select
                  value={newTicketForm.deviceId}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, deviceId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Seleccionar Equipo...</option>
                  {devicesList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.computer_name} ({d.windows_user}) - {d.ip_address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Categoría
                  </label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value as TicketCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {Object.values(TicketCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Prioridad (SLA)
                  </label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value as TicketPriority })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value={TicketPriority.CRITICAL}>Crítica (2 Horas)</option>
                    <option value={TicketPriority.HIGH}>Alta (6 Horas)</option>
                    <option value={TicketPriority.MEDIUM}>Media (24 Horas)</option>
                    <option value={TicketPriority.LOW}>Baja (48 Horas)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Nombre del Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Laura Gómez"
                    value={newTicketForm.contactName}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, contactName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Teléfono / Correo
                  </label>
                  <input
                    type="text"
                    placeholder="809-555-0199"
                    value={newTicketForm.contactInfo}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, contactInfo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Descripción Detallada del Fallo
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describa el comportamiento anómalo o mensaje de error exacto..."
                  value={newTicketForm.problemDescription}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, problemDescription: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20"
                >
                  Generar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVER TICKET */}
      {showResolveModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Marcar Ticket como Resuelto
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Indique las acciones correctivas y notas técnicas de resolución para el ticket <span className="font-mono font-bold text-sky-400">{selectedTicket.ticket_number}</span>.
            </p>

            <textarea
              rows={4}
              placeholder="Ej. Se reparó la conexión a base de datos reiniciando el servicio SQL Server y actualizando las credenciales ODBC..."
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleResolveTicket(selectedTicket.id)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Resolución</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
