import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Send,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Printer,
  CreditCard,
  X,
  Trash2,
  Sparkles,
  Edit,
  Save,
  Check
} from 'lucide-react';
import { Invoice, InvoiceItem } from '../types.ts';

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-2026-001',
    invoiceNumber: 'FAC-B0100004921',
    customerId: 'cust-abc-01',
    customerName: 'ABC Solutions S.R.L.',
    taxId: '131-88992-1',
    issueDate: '2026-08-01',
    dueDate: '2026-08-15',
    items: [
      { id: '1', description: 'Mantenimiento Mensual de Servidores & Redes (SLA Oro)', quantity: 1, unitPrice: 450, total: 450 },
      { id: '2', description: 'Licencia DOTDESK Enterprise Desktop (15 Equipos)', quantity: 15, unitPrice: 12, total: 180 },
      { id: '3', description: 'Soporte Remoto Ilimitado & Respaldo en la Nube', quantity: 1, unitPrice: 120, total: 120 },
    ],
    subtotal: 750,
    taxAmount: 135,
    totalAmount: 885,
    status: 'PAID',
    notes: 'Pago recibido vía Transferencia Bancaria Popular.',
    currency: 'USD',
  },
  {
    id: 'inv-2026-002',
    invoiceNumber: 'FAC-B0100004922',
    customerId: 'cust-med-02',
    customerName: 'Centro Médico Moderno',
    taxId: '101-55443-9',
    issueDate: '2026-08-10',
    dueDate: '2026-08-25',
    items: [
      { id: '1', description: 'Instalación y Configuración de Sistema de Cámaras IP (8 Canales)', quantity: 1, unitPrice: 650, total: 650 },
      { id: '2', description: 'Disco Duro Especializado Western Digital Purple 4TB', quantity: 2, unitPrice: 110, total: 220 },
      { id: '3', description: 'Cableado Estructurado UTP Cat6 y Canalización', quantity: 8, unitPrice: 35, total: 280 },
    ],
    subtotal: 1150,
    taxAmount: 207,
    totalAmount: 1357,
    status: 'SENT',
    notes: 'Válido por 15 días. Factura de crédito fiscal.',
    currency: 'USD',
  },
  {
    id: 'inv-2026-003',
    invoiceNumber: 'FAC-B0100004923',
    customerId: 'cust-log-03',
    customerName: 'Logística & Aduanas del Caribe',
    taxId: '132-00451-2',
    issueDate: '2026-08-18',
    dueDate: '2026-09-02',
    items: [
      { id: '1', description: 'Póliza Mensual Help Desk & Asistencia Remota DOTDESK', quantity: 1, unitPrice: 350, total: 350 },
      { id: '2', description: 'Configuración de VPN Segura WireGuard / Firewall', quantity: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 550,
    taxAmount: 99,
    totalAmount: 649,
    status: 'DRAFT',
    notes: 'Borrador para aprobación de contabilidad.',
    currency: 'USD',
  },
];

export function DotBillInvoicingView() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(INITIAL_INVOICES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingInvId, setEditingInvId] = useState<string>('');

  // Invoice Form State
  const [formData, setFormData] = useState<{
    invoiceNumber: string;
    customerName: string;
    taxId: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    notes: string;
    items: { id: string; description: string; quantity: number; unitPrice: number }[];
  }>({
    invoiceNumber: '',
    customerName: 'ABC Solutions S.R.L.',
    taxId: '131-88992-1',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '2026-09-15',
    currency: 'USD',
    status: 'SENT',
    notes: 'Gracias por su preferencia.',
    items: [{ id: '1', description: 'Soporte y Mantenimiento Técnico Mensual', quantity: 1, unitPrice: 350 }],
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.taxId.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalPending = invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT').reduce((acc, inv) => acc + inv.totalAmount, 0);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingInvId('');
    setFormData({
      invoiceNumber: `FAC-B010000${Math.floor(4930 + Math.random() * 90)}`,
      customerName: 'ABC Solutions S.R.L.',
      taxId: '131-88992-1',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      currency: 'USD',
      status: 'SENT',
      notes: 'Gracias por su preferencia. Documento con validez fiscal.',
      items: [{ id: '1', description: 'Mantenimiento y Soporte Help Desk', quantity: 1, unitPrice: 450 }],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setModalMode('edit');
    setEditingInvId(inv.id);
    setFormData({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      taxId: inv.taxId,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      status: inv.status,
      notes: inv.notes || '',
      items: inv.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });
    setShowModal(true);
  };

  const handleDeleteInvoice = (invId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
      const updated = invoices.filter((i) => i.id !== invId);
      setInvoices(updated);
      if (selectedInvoice?.id === invId) {
        setSelectedInvoice(updated[0] || null);
      }
    }
  };

  const handleToggleStatus = (invId: string, newStatus: 'PAID' | 'SENT' | 'DRAFT') => {
    const updated = invoices.map((inv) => (inv.id === invId ? { ...inv, status: newStatus } : inv));
    setInvoices(updated);
    if (selectedInvoice?.id === invId) {
      setSelectedInvoice({ ...selectedInvoice, status: newStatus });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsFormatted: InvoiceItem[] = formData.items.map((it) => ({
      id: it.id,
      description: it.description || 'Servicio Profesional IT',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    }));

    const subtotal = itemsFormatted.reduce((acc, it) => acc + it.total, 0);
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    if (modalMode === 'create') {
      const created: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: formData.invoiceNumber,
        customerId: 'cust-custom',
        customerName: formData.customerName,
        taxId: formData.taxId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        items: itemsFormatted,
        subtotal,
        taxAmount,
        totalAmount,
        status: formData.status,
        notes: formData.notes,
        currency: formData.currency,
      };
      setInvoices([created, ...invoices]);
      setSelectedInvoice(created);
    } else {
      const updated: Invoice = {
        id: editingInvId,
        invoiceNumber: formData.invoiceNumber,
        customerId: selectedInvoice?.customerId || 'cust-custom',
        customerName: formData.customerName,
        taxId: formData.taxId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        items: itemsFormatted,
        subtotal,
        taxAmount,
        totalAmount,
        status: formData.status,
        notes: formData.notes,
        currency: formData.currency,
      };
      setInvoices(invoices.map((inv) => (inv.id === editingInvId ? updated : inv)));
      setSelectedInvoice(updated);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  SMARTDOT BILL — Facturación & Cobros
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {invoices.length} Comprobantes Emitidos
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Crea, edita y gestiona facturas con valor fiscal (NCF), control de pagos, impuestos (ITBIS 18%) e impresión directa.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Factura / NCF
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Facturado</div>
            <div className="text-xl font-black text-white font-mono">${totalBilled.toLocaleString()} USD</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Cobrado & Liquidado</div>
            <div className="text-xl font-black text-emerald-400 font-mono">${totalPaid.toLocaleString()} USD</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Por Cobrar</div>
            <div className="text-xl font-black text-amber-400 font-mono">${totalPending.toLocaleString()} USD</div>
          </div>
        </div>
      </div>

      {/* Main Invoices Layout: Left List & Right Detail Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoices List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por NCF, cliente o RNC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              {['ALL', 'PAID', 'SENT', 'DRAFT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    statusFilter === st
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todas' : st === 'PAID' ? 'Pagadas' : st === 'SENT' ? 'Pendientes' : 'Borrador'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                No se encontraron facturas registradas.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : inv.status === 'SENT'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {inv.status === 'PAID' ? 'PAGADA' : inv.status === 'SENT' ? 'PENDIENTE' : 'BORRADOR'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white truncate">{inv.customerName}</div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                      <span>{inv.issueDate}</span>
                      <span className="font-bold text-white">${inv.totalAmount.toFixed(2)} {inv.currency}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invoice Preview & Detail */}
        <div className="lg:col-span-7">
          {selectedInvoice ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl relative">
              <div className="flex items-start justify-between border-b border-slate-800 pb-5">
                <div>
                  <div className="text-lg font-black text-white tracking-tight">SMARTDOT IT SOLUTIONS</div>
                  <div className="text-xs text-slate-400">RNC: 131-90022-4 • Santo Domingo, Rep. Dom.</div>
                  <div className="text-xs text-slate-400">soporte@smartdot.com • +1 (809) 555-0199</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase font-mono text-emerald-400 font-bold">Comprobante Fiscal</div>
                  <div className="text-base font-black text-white font-mono">{selectedInvoice.invoiceNumber}</div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Fecha: {selectedInvoice.issueDate}</div>
                  <div className="text-xs text-slate-400 font-mono">Vence: {selectedInvoice.dueDate}</div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Estado:</span>
                  <button
                    onClick={() => handleToggleStatus(selectedInvoice.id, 'PAID')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      selectedInvoice.status === 'PAID'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    Marcar Pagada
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedInvoice.id, 'SENT')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      selectedInvoice.status === 'SENT'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-blue-300'
                    }`}
                  >
                    Pendiente
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedInvoice)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar Factura
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                    className="p-1.5 bg-slate-900 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 transition"
                    title="Eliminar Factura"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Client Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                  Facturado a:
                </div>
                <div className="text-sm font-bold text-white">{selectedInvoice.customerName}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">RNC / Identificación: {selectedInvoice.taxId}</div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-3">Descripción</th>
                      <th className="p-3 text-center">Cant.</th>
                      <th className="p-3 text-right">Precio Unit.</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {selectedInvoice.items.map((it) => (
                      <tr key={it.id} className="text-slate-300">
                        <td className="p-3 font-sans font-medium text-white">{it.description}</td>
                        <td className="p-3 text-center">{it.quantity}</td>
                        <td className="p-3 text-right">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">${it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ITBIS / Impuestos (18%):</span>
                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-emerald-400 font-black">${selectedInvoice.totalAmount.toFixed(2)} {selectedInvoice.currency}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 italic">
                  {selectedInvoice.notes || 'Documento emitido electrónicamente.'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `📄 *FACTURA SMARTDOT #${selectedInvoice.invoiceNumber}*\n` +
                      `🏢 *Cliente:* ${selectedInvoice.customerName}\n` +
                      `💵 *Monto Total:* $${selectedInvoice.totalAmount.toFixed(2)} ${selectedInvoice.currency}\n` +
                      `📅 *Vencimiento:* ${selectedInvoice.dueDate}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Compartir Factura
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-xs">
              Selecciona una factura para visualizar o editar el desglose.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  {modalMode === 'create' ? 'Emitir Nueva Factura' : 'Editar Factura Existente'}
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
                  <label className="text-xs text-slate-400 font-semibold">Número de Factura / NCF:</label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Estado de Pago:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 font-semibold"
                  >
                    <option value="SENT">Pendiente / Enviada</option>
                    <option value="PAID">Pagada / Liquidada</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Cliente / Razón Social:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ABC Solutions S.R.L."
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">RNC / Identificación Fiscal:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 131-88992-1"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Fecha de Emisión:</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Fecha de Vencimiento:</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-semibold">Líneas de Servicios & Productos:</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Fila
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Descripción del servicio o hardware..."
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white text-center font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Precio $"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-28 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white text-right font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">Notas / Condiciones de Pago:</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalles sobre cuentas bancarias o plazos de pago..."
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {modalMode === 'create' ? 'Emitir Factura' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
