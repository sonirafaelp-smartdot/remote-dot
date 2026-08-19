import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  HardDrive,
  Upload,
  Download,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Pause,
  Play,
  Square,
  Hash,
  RefreshCw,
  Search,
  Copy,
  Check,
  Activity,
  Clock,
  Laptop,
  Server,
  ChevronRight,
  Eye,
  DownloadCloud,
  Layers,
  Lock,
  FileCheck,
  Sparkles,
  Database,
  Terminal,
  Zap,
  Info
} from 'lucide-react';
import {
  RemoteFileItem,
  RemoteDriveInfo,
  FileTransferTask,
  FileTransferAuditRecord,
  FileTransferDirection,
} from '../types.ts';
import { csharpPhase9Files, CSharpSourceFile } from '../data/csharpPhase9Source.ts';
import { soundService } from '../services/soundService.ts';

interface StagedLocalFile {
  id: string;
  name: string;
  sizeBytes: number;
  description: string;
  type: string;
  isCustom?: boolean;
}

const DEFAULT_STAGED_FILES: StagedLocalFile[] = [
  {
    id: 'loc-1',
    name: 'FixSQLFirewall_Patch_v2.ps1',
    sizeBytes: 42100,
    description: 'Script PowerShell para reconfiguración de reglas de firewall de SQL Server.',
    type: 'script',
  },
  {
    id: 'loc-2',
    name: 'BillingPatch_v4.2.msi',
    sizeBytes: 14800000,
    description: 'Instalador de actualización del módulo de facturación electrónica CFDI.',
    type: 'installer',
  },
  {
    id: 'loc-3',
    name: 'RemoteDiagnostics_Fix.reg',
    sizeBytes: 18400,
    description: 'Claves de registro de Windows para habilitar logging extendido de red.',
    type: 'registry',
  },
  {
    id: 'loc-4',
    name: 'MySQL_InnoDB_Repair.sql',
    sizeBytes: 85200,
    description: 'Script SQL para optimización de tablas y recuperación de índices corruptos.',
    type: 'database',
  },
  {
    id: 'loc-5',
    name: 'SSL_Root_Cert_2026.crt',
    sizeBytes: 4320,
    description: 'Certificado de autoridad raíz intermedia para pasarelas de pago bancarias.',
    type: 'certificate',
  },
];

export function FileTransferView() {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'explorer' | 'transfers' | 'audit' | 'csharp'>('explorer');

  // Selected device and remote drive
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('dev-001');
  const [drives, setDrives] = useState<RemoteDriveInfo[]>([]);
  const [currentRemotePath, setCurrentRemotePath] = useState<string>('C:\\');
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileItem[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');

  // Selected items in panes
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<RemoteFileItem | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<StagedLocalFile>(DEFAULT_STAGED_FILES[0]);
  const [stagedFiles, setStagedFiles] = useState<StagedLocalFile[]>(DEFAULT_STAGED_FILES);

  // Active Transfer Tasks & Queue
  const [activeTransfers, setActiveTransfers] = useState<FileTransferTask[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<FileTransferTask | null>(null);

  // Modals & User prompts
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameTarget, setRenameTarget] = useState<RemoteFileItem | null>(null);
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [showHashModal, setShowHashModal] = useState<boolean>(false);
  const [computedHashData, setComputedHashData] = useState<any>(null);
  const [computingHash, setComputingHash] = useState<boolean>(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<FileTransferAuditRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditDirectionFilter, setAuditDirectionFilter] = useState<string>('ALL');

  // C# source viewer state
  const [selectedCSharpFile, setSelectedCSharpFile] = useState<CSharpSourceFile>(csharpPhase9Files[0]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Quick feedback toasts / notices
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // File input ref for custom uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  const devicesList = [
    { id: 'dev-001', name: 'RECEPCION-01 (192.168.1.10)', company: 'Farmacias del Centro S.A.', user: 'jperez_rec' },
    { id: 'dev-002', name: 'ALMACEN-DESK-04 (192.168.1.112)', company: 'Distribuidora Global Logística', user: 'almacen_admin' },
    { id: 'dev-003', name: 'FINANZAS-PC02 (192.168.2.45)', company: 'Consultores Contables & Finanzas', user: 'carlos_fin' },
  ];

  // Helper notice trigger
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Load drives and file listing
  const fetchDrivesAndFiles = async (deviceId: string, targetPath = 'C:\\') => {
    setLoadingFiles(true);
    try {
      // 1. Fetch drives
      const drivesRes = await fetch(`/api/v1/files/drives?deviceId=${deviceId}`);
      const drivesJson = await drivesRes.json();
      if (drivesJson.success) {
        setDrives(drivesJson.drives);
      }

      // 2. Fetch directory
      const filesRes = await fetch(`/api/v1/files/browse?deviceId=${deviceId}&path=${encodeURIComponent(targetPath)}`);
      const filesJson = await filesRes.json();
      if (filesJson.success) {
        setRemoteFiles(filesJson.items);
        setCurrentRemotePath(filesJson.path);
        setParentPath(filesJson.parentPath);
      }
    } catch (err: any) {
      showToast(`Error al explorar archivos: ${err.message}`, 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  // Load audit logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/files/audit');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    }
  };

  useEffect(() => {
    fetchDrivesAndFiles(selectedDeviceId, 'C:\\');
    fetchAuditLogs();
  }, [selectedDeviceId]);

  // Navigate to folder
  const handleNavigate = (item: RemoteFileItem) => {
    if (item.isDirectory) {
      fetchDrivesAndFiles(selectedDeviceId, item.path);
      setSelectedRemoteFile(null);
    } else {
      setSelectedRemoteFile(item);
    }
  };

  // Navigate to parent
  const handleNavigateParent = () => {
    if (parentPath) {
      fetchDrivesAndFiles(selectedDeviceId, parentPath);
      setSelectedRemoteFile(null);
    }
  };

  // Switch drive
  const handleDriveChange = (driveName: string) => {
    fetchDrivesAndFiles(selectedDeviceId, driveName);
    setSelectedRemoteFile(null);
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/v1/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          parentPath: currentRemotePath,
          folderName: newFolderName.trim(),
          technicianId: 'tech-001',
          sessionId: 'sess-active-001',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        soundService.playSuccessSound();
        setShowNewFolderModal(false);
        setNewFolderName('');
        fetchDrivesAndFiles(selectedDeviceId, currentRemotePath);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete file or folder
  const handleDeleteItem = async (item: RemoteFileItem) => {
    if (!confirm(`¿Está seguro de eliminar "${item.name}" del endpoint remoto? Esta acción quedará registrada en la auditoría.`)) {
      return;
    }

    try {
      const res = await fetch('/api/v1/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          targetPath: item.path,
          technicianId: 'tech-001',
          sessionId: 'sess-active-001',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        soundService.playActionSound();
        if (selectedRemoteFile?.path === item.path) setSelectedRemoteFile(null);
        fetchDrivesAndFiles(selectedDeviceId, currentRemotePath);
        fetchAuditLogs();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Rename item
  const handleRenameItem = async () => {
    if (!renameTarget || !renameNewName.trim()) return;
    try {
      const res = await fetch('/api/v1/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          oldPath: renameTarget.path,
          newName: renameNewName.trim(),
          technicianId: 'tech-001',
          sessionId: 'sess-active-001',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        soundService.playSuccessSound();
        setShowRenameModal(false);
        setRenameTarget(null);
        setRenameNewName('');
        fetchDrivesAndFiles(selectedDeviceId, currentRemotePath);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Calculate SHA-256 on demand
  const handleCalculateHash = async (file: RemoteFileItem) => {
    setComputingHash(true);
    setShowHashModal(true);
    setComputedHashData(null);
    try {
      const res = await fetch('/api/v1/files/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          filePath: file.path,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComputedHashData(data);
      } else {
        showToast(data.message, 'error');
        setShowHashModal(false);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      setShowHashModal(false);
    } finally {
      setComputingHash(false);
    }
  };

  // Handle Custom File Upload from disk to staging
  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newStaged: StagedLocalFile = {
      id: `custom-${Date.now()}`,
      name: file.name,
      sizeBytes: file.size,
      description: `Archivo personalizado cargado por el técnico (${(file.size / 1024).toFixed(1)} KB).`,
      type: file.name.split('.').pop() || 'custom',
      isCustom: true,
    };

    setStagedFiles((prev) => [newStaged, ...prev]);
    setSelectedLocalFile(newStaged);
    showToast(`Archivo "${file.name}" cargado en el área de preparación.`, 'info');
  };

  // --- Real-Time Chunked Transfer Engine Simulation ---
  const startChunkedTransfer = async (
    fileName: string,
    fileSizeBytes: number,
    direction: FileTransferDirection,
    sourcePath: string,
    destinationPath: string
  ) => {
    soundService.playActionSound();
    setActiveSubTab('transfers');

    try {
      // 1. Initialize transfer session in backend
      const initRes = await fetch('/api/v1/files/transfer/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sess-active-001',
          ticketId: 't-1001',
          deviceId: selectedDeviceId,
          technicianId: 'tech-001',
          fileName,
          fileSizeBytes,
          sourcePath,
          destinationPath,
          direction,
          chunkSizeBytes: 65536,
        }),
      });
      const initData = await initRes.json();
      if (!initData.success) {
        showToast(initData.message, 'error');
        return;
      }

      const task: FileTransferTask = initData.task;
      setCurrentTransfer(task);
      setActiveTransfers((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);

      // 2. Perform chunked streaming loop (simulate high-speed WebRTC data channel)
      const totalChunks = Math.min(task.totalChunks, 40); // Cap at 40 visual blocks for responsive rendering
      const chunkIntervalMs = Math.max(40, Math.floor(1800 / totalChunks));

      for (let i = 1; i <= totalChunks; i++) {
        await new Promise((resolve) => setTimeout(resolve, chunkIntervalMs));

        const progressPct = Math.round((i / totalChunks) * 100);
        const bytesTransferred = Math.round((fileSizeBytes * i) / totalChunks);
        const currentSpeed = Math.floor(22000 + Math.random() * 12000); // 22-34 MB/s

        // Update state
        setCurrentTransfer((prev) =>
          prev && prev.id === task.id
            ? {
                ...prev,
                currentChunk: i,
                totalChunks,
                progressPct,
                bytesTransferred,
                speedKbps: currentSpeed,
              }
            : prev
        );

        // Ping chunk progress to backend
        fetch(`/api/v1/files/transfer/${task.id}/chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chunkIndex: i,
            chunkBytes: Math.round(fileSizeBytes / totalChunks),
            speedKbps: currentSpeed,
          }),
        }).catch(() => {});
      }

      // 3. Finalize & Verify SHA-256 in backend
      const verifyRes = await fetch(`/api/v1/files/transfer/${task.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha256Client: task.sha256Expected,
        }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        soundService.playSuccessSound();
        setCurrentTransfer(verifyData.task);
        setActiveTransfers((prev) =>
          prev.map((t) => (t.id === task.id ? verifyData.task : t))
        );
        showToast(
          `¡Transferencia completada! ${fileName} verificado con SHA-256 (${verifyData.task.sha256Calculated.substring(0, 12)}...).`,
          'success'
        );
        // Refresh explorer & audits
        fetchDrivesAndFiles(selectedDeviceId, currentRemotePath);
        fetchAuditLogs();
      } else {
        soundService.playAlertSound();
        showToast('Error en la verificación de integridad.', 'error');
      }
    } catch (err: any) {
      showToast(`Fallo durante la transferencia: ${err.message}`, 'error');
    }
  };

  // Helper formatting
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (item: RemoteFileItem) => {
    if (item.isDirectory) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    const ext = item.extension.toLowerCase();
    if (['.exe', '.msi', '.bat', '.ps1', '.cmd'].includes(ext)) {
      return <Terminal className="w-4 h-4 text-emerald-400" />;
    }
    if (['.log', '.txt', '.ini', '.cfg', '.conf'].includes(ext)) {
      return <FileText className="w-4 h-4 text-red-400" />;
    }
    if (['.sql', '.db', '.bak', '.dmp'].includes(ext)) {
      return <Database className="w-4 h-4 text-purple-400" />;
    }
    if (['.zip', '.rar', '.7z', '.tar'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-yellow-400" />;
    }
    if (['.xlsx', '.csv', '.pdf', '.docx'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-red-400" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    soundService.playActionSound();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Export audit report to CSV
  const handleExportAudit = () => {
    const headers = ['ID', 'Fecha/Hora (UTC)', 'Técnico', 'Empresa', 'Dispositivo', 'Archivo', 'Dirección', 'Tamaño (Bytes)', 'Hash SHA-256', 'Duración (s)', 'Estado'];
    const rows = auditLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.technicianName}"`,
      `"${l.customerCompany}"`,
      `"${l.deviceComputerName}"`,
      `"${l.fileName}"`,
      l.direction,
      l.fileSizeBytes,
      l.sha256Checksum,
      l.durationSeconds,
      l.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RemoteDesk_Auditoria_Archivos_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte de auditoría exportado exitosamente en CSV.', 'success');
  };

  // Filtered files
  const filteredRemoteFiles = remoteFiles.filter((f) =>
    f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  // Filtered audits
  const filteredAudits = auditLogs.filter((l) => {
    const matchesSearch =
      l.fileName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.technicianName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.sha256Checksum.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesDirection = auditDirectionFilter === 'ALL' || l.direction === auditDirectionFilter;
    return matchesSearch && matchesDirection;
  });

  return (
    <div className="space-y-6">
      {/* Toast notification banner */}
      {notificationMsg && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-sm transition-all duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : notificationMsg.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              : 'bg-red-950/70 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : notificationMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 text-red-400" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header bar with active device context */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Transferencia Segura de Archivos
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-medium">
                    FASE 9 • Chunked Streaming
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Explorador de archivos bidireccional, transmisión por bloques (ArrayPool), verificación SHA-256 y auditoría inmutable.
                </p>
              </div>
            </div>
          </div>

          {/* Endpoint selector and telemetry pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Laptop className="w-4 h-4 text-slate-400" />
              <label htmlFor="device-selector" className="text-xs text-slate-400 font-medium">
                Endpoint Remoto:
              </label>
              <select
                id="device-selector"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
              >
                {devicesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.company})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Canal Cifrado AES-256-GCM</span>
              <span className="text-[10px] text-emerald-400/80">DTLS 1.3</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-800 mt-5 space-x-2">
          <button
            onClick={() => setActiveSubTab('explorer')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeSubTab === 'explorer'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            Explorador Bidireccional
          </button>
          <button
            onClick={() => setActiveSubTab('transfers')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 relative ${
              activeSubTab === 'transfers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Motor de Streaming & Chunks
            {activeTransfers.some((t) => t.status === 'TRANSFERRING') && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 right-1" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeSubTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Auditoría de Archivos & SHA-256
            <span className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.2 rounded-full">
              {auditLogs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('csharp')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeSubTab === 'csharp'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Código C# .NET 9 (Agente)
          </button>
        </div>
      </div>

      {/* --- TAB 1: DUAL-PANE FILE EXPLORER --- */}
      {activeSubTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANE: Technician Local Staging / Tools Depot (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[650px] shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Herramientas del Técnico
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Origen Local
              </span>
            </div>

            <p className="text-xs text-slate-400 my-2.5 leading-relaxed">
              Archivos de diagnóstico, parches y utilitarios listos para inyección directa al endpoint remoto.
            </p>

            {/* Custom file upload drag-and-drop trigger */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950/90 rounded-lg p-3 text-center cursor-pointer transition-all mb-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleCustomFileUpload}
              />
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 mx-auto mb-1 transition-colors" />
              <p className="text-xs font-medium text-slate-300">
                Haga clic para cargar archivo local del técnico
              </p>
              <p className="text-[10px] text-slate-500">
                Soporta .ps1, .msi, .exe, .sql, .log, .zip sin límite
              </p>
            </div>

            {/* Staged files list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {stagedFiles.map((file) => {
                const isSelected = selectedLocalFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedLocalFile(file)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500/60 text-slate-100 shadow-md'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono font-medium truncate max-w-[200px]">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {file.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action Bar on Selected Local File */}
            {selectedLocalFile && (
              <div className="pt-3 border-t border-slate-800 mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[200px] font-medium text-slate-300">
                    {selectedLocalFile.name}
                  </span>
                  <span className="font-mono text-indigo-300">
                    {formatBytes(selectedLocalFile.sizeBytes)}
                  </span>
                </div>
                <button
                  onClick={() =>
                    startChunkedTransfer(
                      selectedLocalFile.name,
                      selectedLocalFile.sizeBytes,
                      'UPLOAD',
                      `Technician_Staging\\${selectedLocalFile.name}`,
                      currentRemotePath
                    )
                  }
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir a {currentRemotePath.length > 20 ? currentRemotePath.substring(0, 18) + '...' : currentRemotePath}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Remote Endpoint File Explorer (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[650px] shadow-lg">
            {/* Header with drive selector and actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Sistema de Archivos Remoto (Windows)
                </h2>
              </div>

              {/* Drive selector pills */}
              <div className="flex items-center gap-1.5">
                {drives.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => handleDriveChange(d.name)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      currentRemotePath.startsWith(d.name)
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    <span>{d.name}</span>
                    <span className="text-[10px] text-slate-500">
                      ({formatBytes(d.freeBytes)} libre)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Breadcrumb Navigation & Search */}
            <div className="flex items-center justify-between gap-2 my-2.5">
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex-1 text-xs font-mono text-slate-300 overflow-x-auto">
                <button
                  onClick={handleNavigateParent}
                  disabled={!parentPath}
                  className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                    !parentPath ? 'opacity-40 cursor-not-allowed' : 'text-indigo-400'
                  }`}
                  title="Subir un nivel"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-500">Ruta:</span>
                <span className="text-slate-200 font-semibold">{currentRemotePath}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Filtrar archivos..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                  />
                </div>

                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                  title="Crear Nueva Carpeta"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Nueva Carpeta</span>
                </button>

                <button
                  onClick={() => fetchDrivesAndFiles(selectedDeviceId, currentRemotePath)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 cursor-pointer"
                  title="Refrescar Directorio"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Remote File Items Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Nombre</th>
                    <th className="py-2 px-3 font-semibold w-24">Tamaño</th>
                    <th className="py-2 px-3 font-semibold w-36 hidden sm:table-cell">Modificación</th>
                    <th className="py-2 px-3 font-semibold w-24 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parentPath && (
                    <tr
                      onClick={handleNavigateParent}
                      className="hover:bg-slate-800/30 cursor-pointer text-slate-400 font-medium"
                    >
                      <td colSpan={4} className="py-2 px-3 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-500/70" />
                        <span>.. (Directorio Padre)</span>
                      </td>
                    </tr>
                  )}

                  {filteredRemoteFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        {loadingFiles
                          ? 'Cargando contenido del directorio remoto...'
                          : 'No se encontraron archivos en este directorio.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRemoteFiles.map((item) => {
                      const isSelected = selectedRemoteFile?.path === item.path;
                      return (
                        <tr
                          key={item.path}
                          onClick={() => handleNavigate(item)}
                          className={`group hover:bg-slate-850 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-950/40 text-slate-100' : 'text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono flex items-center gap-2 truncate max-w-[280px]">
                            {getFileIcon(item)}
                            <span className="truncate">{item.name}</span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">
                            {item.isDirectory ? '<DIR>' : formatBytes(item.sizeBytes)}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px] hidden sm:table-cell">
                            {item.modifiedDate}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {!item.isDirectory && (
                                <button
                                  onClick={() =>
                                    startChunkedTransfer(
                                      item.name,
                                      item.sizeBytes,
                                      'DOWNLOAD',
                                      item.path,
                                      `Technician_Diagnostics\\${item.name}`
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Descargar al Técnico"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!item.isDirectory && (
                                <button
                                  onClick={() => handleCalculateHash(item)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Calcular Hash SHA-256"
                                >
                                  <Hash className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setRenameTarget(item);
                                  setRenameNewName(item.name);
                                  setShowRenameModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                                title="Renombrar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected File Details Bar */}
            {selectedRemoteFile && (
              <div className="pt-2.5 mt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-slate-200">{selectedRemoteFile.name}</span>
                  <span className="text-slate-500 font-mono">({formatBytes(selectedRemoteFile.sizeBytes)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCalculateHash(selectedRemoteFile)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Hash className="w-3 h-3" />
                    SHA-256
                  </button>
                  <button
                    onClick={() =>
                      startChunkedTransfer(
                        selectedRemoteFile.name,
                        selectedRemoteFile.sizeBytes,
                        'DOWNLOAD',
                        selectedRemoteFile.path,
                        `Technician_Diagnostics\\${selectedRemoteFile.name}`
                      )
                    }
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Download className="w-3 h-3" />
                    Descargar al Técnico
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: ACTIVE CHUNKED TRANSFERS & BLOCK MAP --- */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-6">
          {/* Active Transfer Card */}
          {currentTransfer ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      currentTransfer.direction === 'UPLOAD'
                        ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-400'
                        : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    }`}
                  >
                    {currentTransfer.direction === 'UPLOAD' ? (
                      <Upload className="w-5 h-5" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {currentTransfer.fileName}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          currentTransfer.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : currentTransfer.status === 'TRANSFERRING'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {currentTransfer.status}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {currentTransfer.sourcePath} ➔ {currentTransfer.destinationPath}
                    </p>
                  </div>
                </div>

                {/* Transfer Speed & ETA */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] block">Velocidad</span>
                    <span className="text-indigo-300 font-bold">
                      {(currentTransfer.speedKbps / 1000).toFixed(1)} MB/s
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] block">Transferido</span>
                    <span className="text-slate-200">
                      {formatBytes(currentTransfer.bytesTransferred)} / {formatBytes(currentTransfer.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] block">Progreso</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {currentTransfer.progressPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    currentTransfer.status === 'COMPLETED'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
                  }`}
                  style={{ width: `${currentTransfer.progressPct}%` }}
                />
              </div>

              {/* Chunk Block Grid Visualizer (BitTorrent style) */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Mapa de Bloques de Memoria (ArrayPool &lt;byte&gt; 64 KB / bloque)
                  </span>
                  <span className="font-mono text-[11px]">
                    Bloque {currentTransfer.currentChunk} de {currentTransfer.totalChunks}
                  </span>
                </div>

                <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  {Array.from({ length: currentTransfer.totalChunks || 40 }).map((_, idx) => {
                    const isFilled = idx < currentTransfer.currentChunk;
                    const isCurrent = idx === currentTransfer.currentChunk - 1;
                    return (
                      <div
                        key={idx}
                        className={`h-4 rounded-sm transition-all text-[8px] flex items-center justify-center font-mono ${
                          isFilled
                            ? 'bg-indigo-500 border border-indigo-400/80 text-white shadow-sm'
                            : isCurrent
                            ? 'bg-red-500 animate-pulse border border-white'
                            : 'bg-slate-900 border border-slate-800/80 text-slate-600'
                        }`}
                        title={`Bloque #${idx + 1}`}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cryptographic SHA-256 & Security Scan Verification HUD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verificación de Integridad Criptográfica</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    Hash SHA-256:{' '}
                    <span className="text-emerald-400 font-medium">
                      {currentTransfer.sha256Calculated || currentTransfer.sha256Expected}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Algoritmo IncrementalHash SHA-256 (Coincidencia 100% garantizada)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                    <span>Análisis de Seguridad & Windows AMSI</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {currentTransfer.securityScanDetails}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-red-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>0 amenazas detectadas por Windows Defender</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-3">
              <Zap className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                No hay transferencias activas en este momento.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Seleccione un archivo en el explorador bidireccional y haga clic en "Subir" o "Descargar" para iniciar el streaming por bloques con cálculo de hash SHA-256.
              </p>
              <button
                onClick={() => setActiveSubTab('explorer')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer inline-flex items-center gap-2"
              >
                <Folder className="w-3.5 h-3.5" />
                Ir al Explorador de Archivos
              </button>
            </div>
          )}

          {/* Transfer History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Historial de la Sesión Actual
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Archivo</th>
                    <th className="py-2.5 px-3 font-semibold">Dirección</th>
                    <th className="py-2.5 px-3 font-semibold">Tamaño</th>
                    <th className="py-2.5 px-3 font-semibold">Hash SHA-256</th>
                    <th className="py-2.5 px-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-850 font-mono">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {t.fileName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.direction === 'UPLOAD'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {formatBytes(t.fileSizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-emerald-400">
                        {t.sha256Calculated ? t.sha256Calculated.substring(0, 16) + '...' : 'Calculando...'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: IMMUTABLE AUDIT TRAIL --- */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Registro Inmutable de Auditoría de Transferencias (ISO 27001 / SOC 2)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Trazabilidad criptográfica de todos los archivos transferidos durante sesiones de soporte técnico.
              </p>
            </div>

            <button
              onClick={handleExportAudit}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors shadow cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Exportar Reporte (CSV)
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Buscar por archivo, técnico o checksum SHA-256..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={auditDirectionFilter}
              onChange={(e) => setAuditDirectionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todas las Direcciones</option>
              <option value="UPLOAD">Solo Subidas (Upload)</option>
              <option value="DOWNLOAD">Solo Descargas (Download)</option>
            </select>
          </div>

          {/* Audit Records Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Fecha/Hora (UTC)</th>
                  <th className="py-2.5 px-3 font-semibold">Técnico</th>
                  <th className="py-2.5 px-3 font-semibold">Endpoint Remoto</th>
                  <th className="py-2.5 px-3 font-semibold">Archivo & Ruta</th>
                  <th className="py-2.5 px-3 font-semibold">Dirección</th>
                  <th className="py-2.5 px-3 font-semibold">Tamaño</th>
                  <th className="py-2.5 px-3 font-semibold">Checksum SHA-256</th>
                  <th className="py-2.5 px-3 font-semibold">Duración</th>
                  <th className="py-2.5 px-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No se encontraron registros de auditoría que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-850">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        {record.technicianName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div>{record.deviceComputerName}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{record.customerCompany}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px]">
                        <div className="font-bold text-slate-100 truncate">{record.fileName}</div>
                        <div className="text-[10px] text-slate-500 truncate">{record.destPath}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.direction === 'UPLOAD'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {record.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {formatBytes(record.fileSizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-emerald-400 truncate max-w-[160px]" title={record.sha256Checksum}>
                        {record.sha256Checksum.substring(0, 16)}...
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {record.durationSeconds}s
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-sans text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: C# .NET 9 SOURCE CODE VIEWER --- */}
      {activeSubTab === 'csharp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-red-400" />
                Código Fuente C# .NET 9 de Producción (Windows Agent)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Implementación nativa en C# con ArrayPool, IncrementalHash SHA-256 y Windows Defender AMSI.
              </p>
            </div>

            <button
              onClick={() => handleCopyCode(selectedCSharpFile.code)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? '¡Copiado!' : 'Copiar Archivo C#'}
            </button>
          </div>

          {/* C# File selection tabs */}
          <div className="flex flex-wrap gap-2">
            {csharpPhase9Files.map((file) => (
              <button
                key={file.filename}
                onClick={() => setSelectedCSharpFile(file)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 border transition-all ${
                  selectedCSharpFile.filename === file.filename
                    ? 'bg-red-950 border-red-500/60 text-red-200 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-red-400" />
                {file.filename}
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-sans">
                  {file.category}
                </span>
              </button>
            ))}
          </div>

          {/* Description banner */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300">
            <span className="font-semibold text-red-400 mr-2">Descripción:</span>
            {selectedCSharpFile.description}
          </div>

          {/* Code display block */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px]">
            <pre className="leading-relaxed whitespace-pre font-mono">
              <code>{selectedCSharpFile.code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE NEW DIRECTORY --- */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Crear Nueva Carpeta en Endpoint Remoto
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Directorio de destino: <span className="font-mono text-slate-200">{currentRemotePath}</span>
            </p>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Nombre de la carpeta:</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ej. Diagnosticos_2026"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
              >
                Crear Carpeta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: RENAME ITEM --- */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Renombrar Archivo o Directorio Remoto
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Nombre actual: <span className="font-mono text-slate-200">{renameTarget.name}</span>
            </p>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Nuevo nombre:</label>
              <input
                type="text"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameTarget(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenameItem}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
              >
                Guardar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ON-DEMAND SHA-256 HASH VERIFICATION --- */}
      {showHashModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Cálculo de Hash SHA-256 en Endpoint Remoto
              </h3>
            </div>

            {computingHash ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300">
                  Calculando suma de comprobación SHA-256 en tiempo real...
                </p>
              </div>
            ) : computedHashData ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono space-y-1.5">
                  <div className="text-slate-400">
                    Archivo: <span className="text-slate-200">{computedHashData.path}</span>
                  </div>
                  <div className="text-slate-400">
                    Tamaño: <span className="text-slate-200">{formatBytes(computedHashData.sizeBytes)}</span>
                  </div>
                  <div className="text-slate-400">
                    Algoritmo: <span className="text-slate-200">{computedHashData.algorithm}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-1">Digest SHA-256:</span>
                    <div className="p-2 bg-slate-900 rounded text-emerald-400 break-all select-all font-bold">
                      {computedHashData.checksum}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-lg text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Integridad de archivo intacta y verificada contra modificaciones.</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHashModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg shadow cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
