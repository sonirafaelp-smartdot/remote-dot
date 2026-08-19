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
  is_internal_note: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  requested_by_user_id?: string;
  contact_name?: string;
  contact_info?: string;
  technician_id?: string;
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
  customer?: {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
    email: string;
  };
  device?: {
    id: string;
    computer_name: string;
    windows_user: string;
    os_version: string;
    ip_address: string;
    is_online: boolean;
  };
  technician?: {
    id: string;
    specialty: string;
    is_online: boolean;
    user?: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

export interface TicketStats {
  total: number;
  open_total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  waiting_customer: number;
  resolved: number;
  closed: number;
  critical_open: number;
  high_open: number;
  sla_compliance_pct: number;
  sla_violated_count: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface ServerHealth {
  status: string;
  version: string;
  phase: string;
  timestamp: string;
  database: {
    engine: string;
    status: string;
    tables: {
      users: number;
      technicians: number;
      customers: number;
      devices: {
        total: number;
        online: number;
      };
      support_tickets: {
        total: number;
        pending: number;
      };
      remote_sessions: {
        total: number;
        active: number;
      };
      audit_logs: number;
    };
  };
  system: {
    uptime_seconds: number;
    node_version: string;
    memory_usage_mb: number;
    environment: string;
  };
}

export interface RealtimeNotification {
  id: string;
  type: string;
  topic?: 'tickets' | 'devices' | 'sessions' | 'alerts' | 'system';
  severity?: 'info' | 'warning' | 'error' | 'critical' | 'success';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  criticalSound: boolean;
  ticketSound: boolean;
  deviceSound: boolean;
  sessionSound: boolean;
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

export type TechnicianPresenceStatus = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE';

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
  id: string;
  ticket_id: string;
  device_id: string;
  technician_id: string;
  session_token: string;
  security_pin?: string;
  status: RemoteSessionStatus;
  authorized_by_client: boolean;
  permissions?: RemoteSessionPermissions;
  screen_info?: RemoteSessionScreenInfo;
  crypto_spec?: RemoteSessionCryptoSpec;
  telemetry?: RemoteSessionTelemetry;
  started_at?: string;
  ended_at?: string;
  duration_seconds: number;
  quality_setting: 'Low' | 'Balanced' | 'High' | 'Ultra';
  frame_rate: number;
  client_ip: string;
  technician_ip: string;
  created_at: string;
  updated_at: string;
  ticket?: SupportTicket;
  device?: {
    id: string;
    customer_id: string;
    device_uuid: string;
    computer_name: string;
    windows_user: string;
    os_version: string;
    cpu: string;
    ram_mb: number;
    storage_info: string;
    ip_address: string;
    is_online: boolean;
    last_heartbeat: string;
    agent_version: string;
    customer?: {
      id: string;
      company_name: string;
      contact_name: string;
      phone: string;
      email: string;
    };
  };
  technician?: {
    id: string;
    specialty: string;
    is_online: boolean;
    user?: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

export interface TechnicianConsoleKpis {
  totalTickets: number;
  openTicketsCount: number;
  criticalTicketsCount: number;
  resolvedTodayCount: number;
  totalDevicesCount: number;
  onlineDevicesCount: number;
  offlineDevicesCount: number;
  activeSessionsCount: number;
  queuedRequestsCount: number;
  avgResponseTimeMinutes: number;
  slaComplianceRate: number;
  techniciansOnline: number;
}

export interface PingDeviceResult {
  status: 'online' | 'offline';
  device_id: string;
  computer_name: string;
  ip_address: string;
  round_trip_ms: number;
  packet_loss_pct: number;
  agent_version: string;
  windows_user: string;
  os_version: string;
  cpu_usage_est: number;
  ram_usage_mb: number;
  timestamp: string;
}

export type SmartDotAppId = 'dotdesk' | 'dotbill' | 'dotcrm' | 'dotvision' | 'dotshome';

export interface SmartDotAppModule {
  id: SmartDotAppId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  color: string;
  badge: string;
  status: 'active' | 'ready' | 'beta';
}

export type SmartDeviceType = 
  | 'light' 
  | 'thermostat' 
  | 'plug' 
  | 'lock' 
  | 'speaker' 
  | 'tv' 
  | 'vacuum' 
  | 'sensor' 
  | 'camera' 
  | 'hub';

export type SmartHomeEcoSystem = 'google_home' | 'matter' | 'zigbee' | 'tuya' | 'local_lan';

export interface SmartHomeDevice {
  id: string;
  name: string;
  room: string;
  type: SmartDeviceType;
  ecosystem: SmartHomeEcoSystem;
  isOnline: boolean;
  isOn: boolean;
  batteryLevel?: number;
  brightness?: number; // 0 - 100
  colorHex?: string;
  targetTemperature?: number; // °C
  currentTemperature?: number; // °C
  powerConsumptionWatts?: number;
  volume?: number; // 0 - 100
  isLocked?: boolean;
  ipAddress?: string;
  model: string;
  lastUpdated: string;
}

export interface SmartHomeRoom {
  id: string;
  name: string;
  icon: string;
  floor: number;
  temperature: number;
  humidity: number;
  devicesCount: number;
}

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  isp: string;
  serverLocation: string;
  testedAt: string;
  status: 'optimal' | 'good' | 'slow';
}

export type ActiveTab =
  | 'technician-console'
  | 'secure-remote-control'
  | 'file-transfer'
  | 'installer-generator'
  | 'testing-suite'
  | 'audit-logs'
  | 'notifications'
  | 'tickets'
  | 'whatsapp'
  | 'windows-agent'
  | 'customers-devices'
  | 'auth'
  | 'architecture'
  | 'database'
  | 'api-playground'
  | 'roadmap'
  | 'server-health';

// SmartDot Invoicing (DOTBILL) types
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  taxId: string; // RNC o CIF
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number; // ITBIS / IVA (18%)
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  currency: string;
}

// SmartDot CCTV / Surveillance (DOTVISION) types
export interface SecurityCamera {
  id: string;
  name: string;
  location: string;
  customerId: string;
  customerName: string;
  ipAddress: string;
  rtspUrl: string;
  streamUrl?: string; // WebRTC or HLS simulated feed
  status: 'ONLINE' | 'OFFLINE' | 'RECORDING' | 'MOTION_DETECTED';
  resolution: string; // e.g. "4K UHD", "1080p 60fps"
  ptzSupport: boolean;
  nightVision: boolean;
  fps: number;
  bitrateKbps: number;
}

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'twilio' | 'meta' | 'webhook' | 'browser_direct';
  recipientNumber: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  metaApiToken?: string;
  metaPhoneNumberId?: string;
  webhookUrl?: string;
  notifyOnCritical: boolean;
  notifyOnHigh: boolean;
  notifyOnMedium: boolean;
  notifyOnLow: boolean;
}

export interface WhatsAppDispatchLog {
  id: string;
  timestamp: string;
  ticketNumber: string;
  recipient: string;
  provider: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED' | 'READY_LINK';
  messagePreview: string;
  directWhatsAppWebUrl: string;
  details?: string;
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

export interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  created_at?: string;
}

// ==========================================
// FASE 11: INSTALADORES Y DESPLIEGUE WINDOWS
// ==========================================

export type InstallerPackageType =
  | 'MSI_PACKAGE'
  | 'INNO_SETUP_EXE'
  | 'PORTABLE_QUICK_SUPPORT'
  | 'POWERSHELL_DEPLOYER';

export type InstallationMode =
  | 'UNATTENDED_SERVICE'
  | 'ON_DEMAND_USER'
  | 'ENTERPRISE_GPO_INTUNE';

export interface CustomerEnrollmentConfig {
  customerId: string;
  customerCompany: string;
  tenantKey: string;
  enrollmentToken: string;
  tokenExpiresAt: string;
  serverUrl: string;
  wsRelayUrl: string;
  installationMode: InstallationMode;
  packageType: InstallerPackageType;
  autoStartWithWindows: boolean;
  serviceName: string;
  serviceDisplayName: string;
  allowUnattendedAccess: boolean;
  requirePinForIncomingSessions: boolean;
  defaultPin?: string;
  openFirewallExceptions: boolean;
  enableWatchdogAutoRecovery: boolean;
  departmentGroup?: string;
  customLogoUrl?: string;
}

export interface GeneratedDeploymentPackage {
  id: string;
  customerId: string;
  customerCompany: string;
  packageType: InstallerPackageType;
  installationMode: InstallationMode;
  fileName: string;
  fileSizeBytes: number;
  sha256Hash: string;
  downloadUrl: string;
  enrollmentToken: string;
  tokenExpiresAt: string;
  createdAt: string;
  embeddedConfig: CustomerEnrollmentConfig;
  silentCommands: {
    cmdPrompt: string;
    powershell: string;
    intuneInstallCmd: string;
    gpoStartupScript: string;
    ninjaRmmScript: string;
  };
  generatedFiles: {
    innoSetupScript?: string;
    wixToolsetXml?: string;
    appsettingsJson: string;
    deployPowerShellScript: string;
    cleanupUninstallScript: string;
  };
}

export interface FirewallRuleSpec {
  ruleName: string;
  direction: 'Inbound' | 'Outbound';
  protocol: 'TCP' | 'UDP';
  ports: string;
  action: 'Allow';
  profiles: string;
  description: string;
  commandNetsh: string;
  commandPowerShell: string;
}

export interface ServicePermissionSpec {
  serviceName: string;
  displayName: string;
  account: 'NT AUTHORITY\\LocalSystem' | 'NT AUTHORITY\\NetworkService';
  startType: 'Automatic (Delayed Start)' | 'Automatic';
  recoveryFirstFailure: 'Restart Service (1 min)';
  recoverySecondFailure: 'Restart Service (2 min)';
  recoverySubsequentFailures: 'Restart Service (5 min)';
  resetFailCountDays: 1;
  daclPermissions: string;
  session0IsolationHandling: string;
}

export interface EnrollmentSimulationStep {
  stepNumber: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  outputLog?: string;
  durationMs?: number;
}

export interface EnrollmentSimulationResult {
  success: boolean;
  deviceId: string;
  computerName: string;
  osVersion: string;
  ipAddress: string;
  hwidHash: string;
  serviceStatus: string;
  firewallRulesAdded: number;
  connectionVerified: boolean;
  steps: EnrollmentSimulationStep[];
  enrolledAt: string;
}

// ==========================================
// FASE 12: PRUEBAS Y CORRECCIÓN DE ERRORES
// ==========================================

export type NatTopologyType =
  | 'OPEN_INTERNET'
  | 'FULL_CONE_NAT'
  | 'RESTRICTED_CONE_NAT'
  | 'PORT_RESTRICTED_NAT'
  | 'SYMMETRIC_NAT_STRICT'
  | 'DOUBLE_NAT_CGNAT'
  | 'UDP_BLOCKED';

export type IceCandidateType = 'host' | 'srflx' | 'relay';

export interface StunTurnServerConfig {
  id: string;
  name: string;
  urls: string;
  type: 'STUN' | 'TURN' | 'TURNS';
  transport: 'UDP' | 'TCP' | 'TLS';
  username?: string;
  credential?: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  rttMs: number;
  packetLossPercent: number;
}

export interface NatTraversalTestResult {
  detectedTopology: NatTopologyType;
  publicIp: string;
  publicPort: number;
  localIp: string;
  localPort: number;
  hairpinningSupported: boolean;
  directP2pPossible: boolean;
  turnRelayRequired: boolean;
  selectedCandidatePair: {
    localType: IceCandidateType;
    remoteType: IceCandidateType;
    protocol: 'UDP' | 'TCP';
    rttMs: number;
    relayServerUsed?: string;
  };
  iceGatheringTimeMs: number;
  testedAt: string;
  recommendations: string[];
}

export interface LoadTestScenarioConfig {
  concurrentConnections: number;
  durationSeconds: number;
  messagesPerSecondPerClient: number;
  trafficPattern: 'CONSTANT_STREAM' | 'SPIKE_BURST' | 'GRADUAL_RAMP_UP' | 'RECONNECT_STORM';
  includeWebRtcSdpSignaling: boolean;
  includeHeartbeatPing: boolean;
}

export interface LoadTestMetricPoint {
  timestampSeconds: number;
  activeConnections: number;
  requestsPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  errorRatePercent: number;
  cpuUsagePercent: number;
  ramUsageMb: number;
}

export interface LoadTestSummaryResult {
  scenario: LoadTestScenarioConfig;
  totalRequestsSent: number;
  totalSuccessfulRequests: number;
  totalFailedRequests: number;
  avgThroughputMsgSec: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  packetLossRate: number;
  serverCpuPeakPercent: number;
  serverRamPeakMb: number;
  bottleneckDetected: boolean;
  bottleneckReason?: string;
  series: LoadTestMetricPoint[];
  executedAt: string;
}

export type SecurityCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'OPTIMAL';

export interface SecurityAuditItem {
  id: string;
  category: 'AUTHENTICATION' | 'MEMORY_PROTECTION' | 'PERMISSIONS_DACL' | 'NETWORK_TRANSPORT' | 'ANTIVIRUS_AMSI' | 'INPUT_VALIDATION';
  name: string;
  description: string;
  standardRef: string; // NIST SP 800-53, CIS, ISO 27001
  status: SecurityCheckStatus;
  details: string;
  remediation?: string;
}

export interface SecurityAuditReport {
  overallScore: number; // 0 - 100
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  totalChecks: number;
  evaluatedAt: string;
  items: SecurityAuditItem[];
}

export interface SystemUnitTestItem {
  id: string;
  module: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  assertionsPassed: number;
  details?: string;
}

export interface SystemTestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  codeCoveragePercent: number;
  durationMs: number;
  executedAt: string;
  tests: SystemUnitTestItem[];
}



