export enum UserRole {
  ADMIN = 'Admin',
  TECHNICIAN = 'Technician',
  CUSTOMER = 'Customer',
}

export enum TicketPriority {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta',
  CRITICAL = 'Crítica',
}

export enum TicketStatus {
  PENDING = 'Pendiente',
  ASSIGNED = 'Asignado',
  IN_PROGRESS = 'En progreso',
  WAITING_CUSTOMER = 'Esperando cliente',
  RESOLVED = 'Resuelto',
  CLOSED = 'Cerrado',
}

export enum RemoteSessionStatus {
  REQUESTED = 'Esperando técnico',
  TECHNICIAN_ASSIGNED = 'Técnico asignado',
  AUTHORIZED = 'Sesión autorizada',
  ACTIVE = 'Sesión activa',
  COMPLETED = 'Sesión finalizada',
  TERMINATED = 'Sesión revocada',
  REJECTED = 'Rechazada',
}

export interface User {
  id: string; // UUID PK
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string; // UUID PK
  user_id: string; // FK -> Users.id
  specialty: string;
  is_online: boolean;
  max_concurrent_sessions: number;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  user?: User;
}

export interface Customer {
  id: string; // UUID PK
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string; // UUID PK
  customer_id: string; // FK -> Customers.id
  device_uuid: string; // Hardware Unique GUID
  computer_name: string;
  windows_user: string;
  os_version: string;
  cpu: string;
  ram_mb: number;
  storage_info: string;
  ip_address: string;
  mac_address?: string;
  is_online: boolean;
  last_heartbeat: string;
  agent_version: string;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  customer?: Customer;
}

export enum TicketCategory {
  SOFTWARE_ERP = 'Software / ERP / Facturación',
  NETWORK_INTERNET = 'Redes & Internet',
  PRINT_PERIPHERALS = 'Impresoras & Periféricos',
  WINDOWS_SYSTEM = 'Sistema Operativo / Windows',
  SECURITY_VIRUS = 'Seguridad / Antivirus',
  ACCOUNT_ACCESS = 'Cuentas & Accesos',
  GENERAL = 'Consulta General',
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_name: string;
  author_role: 'Technician' | 'Customer' | 'Admin' | 'System';
  author_id?: string;
  message: string;
  is_internal_note: boolean; // Private technical note vs customer visible
  created_at: string;
}

export interface SupportTicket {
  id: string; // UUID PK
  ticket_number: string; // e.g. "TICK-000125"
  customer_id: string; // FK -> Customers.id
  device_id: string; // FK -> Devices.id
  requested_by_user_id?: string; // FK -> Users.id (optional)
  contact_name?: string;
  contact_info?: string;
  technician_id?: string; // FK -> Technicians.id (optional)
  category?: TicketCategory;
  problem_description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution_notes?: string;
  comments?: TicketComment[];
  sla_due_at?: string;
  first_responded_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  customer?: Customer;
  device?: Device;
  technician?: Technician;
}

export interface RemoteSessionPermissions {
  view_only: boolean;
  allow_input: boolean;
  allow_clipboard: boolean;
  allow_file_transfer: boolean;
  block_remote_input_during_uac: boolean;
}

export interface RemoteSessionScreenInfo {
  monitors_count: number;
  selected_monitor: number;
  resolution: string;
  color_depth: string;
  scaling_factor_pct: number;
}

export interface RemoteSessionCryptoSpec {
  cipher: 'AES-256-GCM';
  protocol: 'WebRTC DTLS 1.3 / SRTP';
  handshake_fingerprint: string;
  key_rotation_interval_seconds: number;
}

export interface RemoteSessionTelemetry {
  current_fps: number;
  bitrate_kbps: number;
  rtt_latency_ms: number;
  packet_loss_pct: number;
  dirty_rects_pct: number;
  bandwidth_saved_pct: number;
  gpu_encoder: string;
  frames_rendered: number;
}

export interface RemoteSession {
  id: string; // UUID PK
  ticket_id: string; // FK -> SupportTickets.id
  device_id: string; // FK -> Devices.id
  technician_id: string; // FK -> Technicians.id
  session_token: string; // Cryptographic one-time token
  security_pin?: string; // 6-digit one-time consent PIN (e.g. "849201")
  status: RemoteSessionStatus;
  authorized_by_client: boolean;
  permissions: RemoteSessionPermissions;
  screen_info: RemoteSessionScreenInfo;
  crypto_spec: RemoteSessionCryptoSpec;
  telemetry: RemoteSessionTelemetry;
  started_at?: string;
  ended_at?: string;
  duration_seconds: number;
  quality_setting: 'Low' | 'Balanced' | 'High' | 'Ultra';
  frame_rate: number;
  client_ip: string;
  technician_ip: string;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  ticket?: SupportTicket;
  device?: Device;
  technician?: Technician;
}

export interface AuditLog {
  id: string; // UUID PK
  user_id?: string; // FK -> Users.id (NULL for system events)
  action: string; // e.g. "REMOTE_SESSION_STARTED", "TICKET_CREATED", "FILE_TRANSFER_COMPLETED"
  entity_type: string; // "SupportTicket", "RemoteSession", "Device", "FileTransfer"
  entity_id: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
  // Hydrated
  user?: User;
}

export type FileTransferDirection = 'UPLOAD' | 'DOWNLOAD';
export type FileTransferStatus =
  | 'QUEUED'
  | 'TRANSFERRING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface RemoteFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  extension: string;
  modifiedDate: string;
  attributes: {
    isReadOnly: boolean;
    isHidden: boolean;
    isSystem: boolean;
  };
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
}

export interface RemoteDriveInfo {
  name: string;
  label: string;
  driveType: 'Fixed' | 'Removable' | 'Network' | 'CDRom';
  totalBytes: number;
  freeBytes: number;
  format: string;
}

export interface FileTransferTask {
  id: string;
  sessionId: string;
  ticketId?: string;
  deviceId: string;
  technicianId: string;
  fileName: string;
  fileSizeBytes: number;
  sourcePath: string;
  destinationPath: string;
  direction: FileTransferDirection;
  status: FileTransferStatus;
  progressPct: number;
  bytesTransferred: number;
  speedKbps: number;
  chunkSizeBytes: number;
  totalChunks: number;
  currentChunk: number;
  sha256Expected: string;
  sha256Calculated: string;
  sha256Verified: boolean;
  securityScanResult: 'CLEAN' | 'SUSPICIOUS' | 'BLOCKED' | 'SCANNING';
  securityScanDetails: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface FileTransferAuditRecord {
  id: string;
  timestamp: string;
  sessionId: string;
  ticketId: string;
  technicianName: string;
  customerCompany: string;
  deviceComputerName: string;
  fileName: string;
  sourcePath: string;
  destPath: string;
  direction: FileTransferDirection;
  fileSizeBytes: number;
  sha256Checksum: string;
  durationSeconds: number;
  avgSpeedKbps: number;
  status: 'SUCCESS' | 'CANCELLED' | 'BLOCKED_BY_POLICY' | 'CORRUPTED_HASH';
  clientApproved: boolean;
}

// --- FASE 10: Auditoría, Logs Inmutables y Reportes de Servicio ---

export type AuditActionCategory =
  | 'ALL'
  | 'SESSION'
  | 'TICKET_CHANGE'
  | 'FILE_TRANSFER'
  | 'DEVICE_ACTION'
  | 'AUTH'
  | 'SECURITY_ALERT'
  | 'SYSTEM_POLICY';

export interface AuditEventDiff {
  field: string;
  before: any;
  after: any;
}

export interface AuditEventActor {
  id: string;
  name: string;
  role: 'Admin' | 'Technician' | 'Customer' | 'System' | 'WindowsAgent';
  ip: string;
  userAgent?: string;
}

export interface AuditEventTarget {
  entityType: 'SupportTicket' | 'RemoteSession' | 'Device' | 'FileTransfer' | 'User' | 'Customer' | 'System';
  entityId: string;
  label: string;
  customerId?: string;
  customerName?: string;
  deviceId?: string;
  deviceName?: string;
  ticketNumber?: string;
}

export interface AuditEvent {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  category: AuditActionCategory;
  action: string;
  actionTitle: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'success';
  actor: AuditEventActor;
  target: AuditEventTarget;
  details: Record<string, any>;
  diffs?: AuditEventDiff[];
  hmacSignature: string;
  previousBlockSha256: string;
  verified: boolean;
}

export interface SessionAuditRecord {
  id: string;
  sessionId: string;
  ticketNumber: string;
  ticketId: string;
  ticketCategory: string;
  customerId: string;
  customerCompany: string;
  customerContact: string;
  deviceId: string;
  deviceComputerName: string;
  deviceWindowsUser: string;
  deviceIp: string;
  deviceOs: string;
  technicianId: string;
  technicianName: string;
  technicianEmail: string;
  technicianIp: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  resolution: string;
  avgFps: number;
  avgBitrateKbps: number;
  bandwidthSavedPct: number;
  keystrokesCount: number;
  mouseClicksCount: number;
  fileTransfersCount: number;
  bytesTransferred: number;
  terminationReason:
    | 'SLA_RESOLVED'
    | 'TECHNICIAN_CLOSED'
    | 'CLIENT_DISCONNECTED'
    | 'PANIC_BUTTON_TRIGGERED'
    | 'IDLE_TIMEOUT';
  clientConsentProof: {
    granted: boolean;
    pinUsed: string;
    consentTimestamp: string;
    clientIp: string;
    consentType: 'PIN_AUTH_6_DIGIT' | 'DESKTOP_POPUP_CLICK' | 'UAC_ELEVATED';
  };
  hmacSignature: string;
  complianceStandards: string[];
  notes?: string;
}

export interface CustomerServiceReportSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  customerId: string;
  customerCompany: string;
  customerContact: string;
  customerEmail: string;
  kpis: {
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    slaCompliancePct: number;
    slaViolatedCount: number;
    avgFirstResponseMinutes: number;
    avgResolutionHours: number;
    totalRemoteSessions: number;
    totalRemoteMinutes: number;
    filesTransferredCount: number;
    totalBytesTransferred: number;
    criticalIncidentsCount: number;
  };
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  techniciansInvolved: Array<{
    technicianId: string;
    technicianName: string;
    specialty: string;
    ticketsHandled: number;
    sessionMinutes: number;
    satisfactionRating: number;
  }>;
  recentTickets: SupportTicket[];
  sessionHistory: SessionAuditRecord[];
  generatedAt: string;
  reportId: string;
}

export interface AuditChainVerificationResult {
  isValid: boolean;
  totalBlocksVerified: number;
  tamperedBlocksCount: number;
  tamperedBlockIds: string[];
  algorithm: string;
  rootGenesisHash: string;
  latestBlockHash: string;
  verifiedAt: string;
}

