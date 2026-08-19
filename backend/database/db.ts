import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  User,
  Technician,
  Customer,
  Device,
  SupportTicket,
  RemoteSession,
  AuditLog,
  UserRole,
  TicketPriority,
  TicketStatus,
  RemoteSessionStatus,
  TicketCategory,
  TicketComment,
  RemoteFileItem,
  RemoteDriveInfo,
  FileTransferTask,
  FileTransferAuditRecord,
  FileTransferStatus,
  FileTransferDirection,
  AuditEvent,
  SessionAuditRecord,
  CustomerServiceReportSummary,
  AuditChainVerificationResult,
  AuditActionCategory,
} from './entities.ts';

// In-Memory & Local Database Repository layer matching PostgreSQL schema
export class DatabaseStore {
  public users: Map<string, User> = new Map();
  public technicians: Map<string, Technician> = new Map();
  public customers: Map<string, Customer> = new Map();
  public devices: Map<string, Device> = new Map();
  public tickets: Map<string, SupportTicket> = new Map();
  public sessions: Map<string, RemoteSession> = new Map();
  public auditLogs: AuditLog[] = [];
  public fileTransfers: Map<string, FileTransferTask> = new Map();
  public fileAuditLogs: FileTransferAuditRecord[] = [];
  public deviceFiles: Map<string, RemoteFileItem[]> = new Map();
  public deviceDrives: Map<string, RemoteDriveInfo[]> = new Map();
  public structuredAuditEvents: AuditEvent[] = [];
  public sessionAuditRecords: SessionAuditRecord[] = [];

  private auditEventCounter = 0;
  private lastBlockSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
  private hmacSecretKey = 'REMOTEDESK_ENTERPRISE_AUDIT_LEDGER_SECRET_2026';

  private ticketCounter = 1000;

  constructor() {
    this.seedInitialData();
  }

  public hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  public verifyPassword(plainPassword: string, passwordHash: string): boolean {
    try {
      return bcrypt.compareSync(plainPassword, passwordHash);
    } catch {
      return false;
    }
  }

  public seedInitialData() {
    // Standard test passwords hashed with bcrypt:
    // Admin: "Admin123!"
    // Technicians: "Tech123!"
    // Customer: "Client123!"
    const adminHash = this.hashPassword('Admin123!');
    const techHash = this.hashPassword('Tech123!');
    const clientHash = this.hashPassword('Client123!');

    // 1. Seed Users
    const adminUser: User = {
      id: 'u-1001-admin',
      email: 'admin@remotedesk.com',
      password_hash: adminHash,
      full_name: 'Carlos Mendoza (Admin)',
      role: UserRole.ADMIN,
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const techUser1: User = {
      id: 'u-1002-tech1',
      email: 'tecnico.ramirez@remotedesk.com',
      password_hash: techHash,
      full_name: 'Ing. Roberto Ramírez',
      role: UserRole.TECHNICIAN,
      is_active: true,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const techUser2: User = {
      id: 'u-1003-tech2',
      email: 'laura.soporte@remotedesk.com',
      password_hash: techHash,
      full_name: 'Lic. Laura Fernández',
      role: UserRole.TECHNICIAN,
      is_active: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const clientUser1: User = {
      id: 'u-1004-cust1',
      email: 'juan.perez@abcsolutions.com',
      password_hash: clientHash,
      full_name: 'Juan Pérez (ABC Solutions)',
      role: UserRole.CUSTOMER,
      is_active: true,
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(techUser1.id, techUser1);
    this.users.set(techUser2.id, techUser2);
    this.users.set(clientUser1.id, clientUser1);

    // 2. Seed Technicians
    const tech1: Technician = {
      id: 'tech-001',
      user_id: techUser1.id,
      specialty: 'Sistemas Windows & Redes',
      is_online: true,
      max_concurrent_sessions: 3,
      created_at: techUser1.created_at,
      updated_at: new Date().toISOString(),
    };

    const tech2: Technician = {
      id: 'tech-002',
      user_id: techUser2.id,
      specialty: 'Software Facturación & ERP',
      is_online: true,
      max_concurrent_sessions: 2,
      created_at: techUser2.created_at,
      updated_at: new Date().toISOString(),
    };

    this.technicians.set(tech1.id, tech1);
    this.technicians.set(tech2.id, tech2);

    // 3. Seed Customers
    const customer1: Customer = {
      id: 'cust-abc-01',
      company_name: 'ABC Solutions S.R.L.',
      contact_name: 'Juan Pérez',
      phone: '809-555-0199',
      email: 'juan.perez@abcsolutions.com',
      address: 'Av. Winston Churchill #45, Santo Domingo',
      is_active: true,
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const customer2: Customer = {
      id: 'cust-global-02',
      company_name: 'Global Logística Express',
      contact_name: 'Dra. Carmen Vega',
      phone: '809-555-0844',
      email: 'carmen.vega@globallogistics.com',
      address: 'Parque Industrial Duarte Km 13',
      is_active: true,
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.customers.set(customer1.id, customer1);
    this.customers.set(customer2.id, customer2);

    // 4. Seed Devices
    const dev1: Device = {
      id: 'dev-recep-01',
      customer_id: customer1.id,
      device_uuid: 'WIN-UUID-4B89-ABC1-RECEPCION01',
      computer_name: 'RECEPCION-01',
      windows_user: 'jperez_rec',
      os_version: 'Windows 11 Pro 64-bit (Build 22631)',
      cpu: 'Intel Core i5-12400 (6 Cores, 12 Threads @ 2.50GHz)',
      ram_mb: 16384,
      storage_info: 'SSD NVMe 512GB (320GB Libres)',
      ip_address: '192.168.1.105',
      mac_address: '00:1A:2B:3C:4D:5E',
      is_online: true,
      last_heartbeat: new Date().toISOString(),
      agent_version: '1.0.0',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dev2: Device = {
      id: 'dev-conta-02',
      customer_id: customer1.id,
      device_uuid: 'WIN-UUID-9F31-ABC2-CONTABILIDAD01',
      computer_name: 'ABC-CONTABILIDAD-01',
      windows_user: 'mrodriguez_fin',
      os_version: 'Windows 10 Pro 64-bit (Build 19045)',
      cpu: 'AMD Ryzen 5 5600G (6 Cores @ 3.90GHz)',
      ram_mb: 16384,
      storage_info: 'SSD 480GB (190GB Libres)',
      ip_address: '192.168.1.112',
      mac_address: '00:1A:2B:99:88:77',
      is_online: true,
      last_heartbeat: new Date(Date.now() - 60000).toISOString(),
      agent_version: '1.0.0',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dev3: Device = {
      id: 'dev-srv-01',
      customer_id: customer1.id,
      device_uuid: 'WIN-UUID-8891-SRV1-SERVER01',
      computer_name: 'ABC-SERVER-01',
      windows_user: 'Administrator',
      os_version: 'Windows Server 2022 Datacenter',
      cpu: 'Intel Xeon Silver 4314 (16 Cores @ 2.40GHz)',
      ram_mb: 65536,
      storage_info: 'RAID 10 SSD 2TB (1.4TB Libres)',
      ip_address: '192.168.1.10',
      mac_address: '00:50:56:C0:00:08',
      is_online: true,
      last_heartbeat: new Date().toISOString(),
      agent_version: '1.0.0',
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.devices.set(dev1.id, dev1);
    this.devices.set(dev2.id, dev2);
    this.devices.set(dev3.id, dev3);

    // 5. Seed Initial Support Tickets
    const ticket1: SupportTicket = {
      id: 't-1001',
      ticket_number: 'TICK-000125',
      customer_id: customer1.id,
      device_id: dev1.id,
      contact_name: 'Juan Pérez',
      contact_info: '809-555-0199 (jperez@abcsolutions.com)',
      technician_id: tech1.id,
      category: TicketCategory.SOFTWARE_ERP,
      problem_description: 'No puedo abrir el sistema de facturación electrónica. Muestra error de conexión a la base de datos SQL.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      resolution_notes: 'Revisando servicio local SQL Server y reglas de firewall en RECEPCION-01.',
      sla_due_at: new Date(Date.now() + 5 * 3600000).toISOString(),
      first_responded_at: new Date(Date.now() - 3000000).toISOString(),
      comments: [
        {
          id: 'c-1',
          ticket_id: 't-1001',
          author_name: 'Juan Pérez',
          author_role: 'Customer',
          message: 'El error apareció de repente al intentar emitir la factura #8921.',
          is_internal_note: false,
          created_at: new Date(Date.now() - 3500000).toISOString(),
        },
        {
          id: 'c-2',
          ticket_id: 't-1001',
          author_name: 'Ing. Roberto Ramírez',
          author_role: 'Technician',
          message: 'Nota interna: El puerto 1433 de SQL Server estaba bloqueado por Windows Defender después de reiniciar.',
          is_internal_note: true,
          created_at: new Date(Date.now() - 1800000).toISOString(),
        }
      ],
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    };

    const ticket2: SupportTicket = {
      id: 't-1002',
      ticket_number: 'TICK-000126',
      customer_id: customer1.id,
      device_id: dev2.id,
      contact_name: 'María Rodríguez',
      contact_info: 'Ext. 104 (mrodriguez@abcsolutions.com)',
      technician_id: undefined,
      category: TicketCategory.PRINT_PERIPHERALS,
      problem_description: 'La impresora de recibos de contabilidad no responde después de la última actualización de Windows.',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.PENDING,
      sla_due_at: new Date(Date.now() + 20 * 3600000).toISOString(),
      comments: [],
      created_at: new Date(Date.now() - 900000).toISOString(),
      updated_at: new Date(Date.now() - 900000).toISOString(),
    };

    const ticket3: SupportTicket = {
      id: 't-1003',
      ticket_number: 'TICK-000127',
      customer_id: customer2.id,
      device_id: dev3.id,
      contact_name: 'Dra. Carmen Vega',
      contact_info: '809-555-0844',
      technician_id: tech2.id,
      category: TicketCategory.SECURITY_VIRUS,
      problem_description: 'Alerta crítica de Windows Defender: Detección de intento de conexión no autorizada por puerto RDP.',
      priority: TicketPriority.CRITICAL,
      status: TicketStatus.ASSIGNED,
      sla_due_at: new Date(Date.now() + 90 * 60000).toISOString(),
      first_responded_at: new Date(Date.now() - 600000).toISOString(),
      comments: [
        {
          id: 'c-3',
          ticket_id: 't-1003',
          author_name: 'Lic. Laura Fernández',
          author_role: 'Technician',
          message: 'Asignado con prioridad crítica. Aislaremos la IP sospechosa en la política de firewall perimetral.',
          is_internal_note: false,
          created_at: new Date(Date.now() - 500000).toISOString(),
        }
      ],
      created_at: new Date(Date.now() - 1200000).toISOString(),
      updated_at: new Date(Date.now() - 500000).toISOString(),
    };

    const ticket4: SupportTicket = {
      id: 't-1004',
      ticket_number: 'TICK-000124',
      customer_id: customer1.id,
      device_id: dev1.id,
      contact_name: 'Juan Pérez',
      contact_info: '809-555-0199',
      technician_id: tech1.id,
      category: TicketCategory.WINDOWS_SYSTEM,
      problem_description: 'Lentitud extrema y 100% de uso de disco en el arranque de Windows.',
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      resolution_notes: 'Se deshabilitaron servicios de telemetría obsoletos y se liberó espacio en el disco C:\\ temporal. El rendimiento volvió al 100%.',
      resolved_at: new Date(Date.now() - 14400000).toISOString(),
      comments: [
        {
          id: 'c-4',
          ticket_id: 't-1004',
          author_name: 'Ing. Roberto Ramírez',
          author_role: 'Technician',
          message: 'Optimización completada. Se ejecutó DISM /Online /Cleanup-Image y CHKDSK.',
          is_internal_note: true,
          created_at: new Date(Date.now() - 15000000).toISOString(),
        }
      ],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 14400000).toISOString(),
    };

    this.tickets.set(ticket1.id, ticket1);
    this.tickets.set(ticket2.id, ticket2);
    this.tickets.set(ticket3.id, ticket3);
    this.tickets.set(ticket4.id, ticket4);

    // 6. Seed Sample Active & Queued Sessions
    const session1: RemoteSession = {
      id: 'sess-001',
      ticket_id: ticket1.id,
      device_id: dev1.id,
      technician_id: tech1.id,
      session_token: 'SESSTOKEN-9988-ABC-AUTH-SECURE',
      security_pin: '849201',
      status: RemoteSessionStatus.ACTIVE,
      authorized_by_client: true,
      permissions: {
        view_only: false,
        allow_input: true,
        allow_clipboard: true,
        allow_file_transfer: true,
        block_remote_input_during_uac: true,
      },
      screen_info: {
        monitors_count: 2,
        selected_monitor: 1,
        resolution: '1920x1080',
        color_depth: '24-bit TrueColor',
        scaling_factor_pct: 100,
      },
      crypto_spec: {
        cipher: 'AES-256-GCM',
        protocol: 'WebRTC DTLS 1.3 / SRTP',
        handshake_fingerprint: 'SHA256:7B:3A:99:F1:4E:22:90:DA:55:18:2C:EE:88:41:9B:04',
        key_rotation_interval_seconds: 3600,
      },
      telemetry: {
        current_fps: 59.8,
        bitrate_kbps: 4250,
        rtt_latency_ms: 12,
        packet_loss_pct: 0.0,
        dirty_rects_pct: 18.5,
        bandwidth_saved_pct: 81.5,
        gpu_encoder: 'NVIDIA NVENC H.264 (DirectX 11 DXGI)',
        frames_rendered: 72400,
      },
      started_at: new Date(Date.now() - 1200000).toISOString(),
      duration_seconds: 1200,
      quality_setting: 'High',
      frame_rate: 60,
      client_ip: '192.168.1.105',
      technician_ip: '200.88.45.12',
      created_at: new Date(Date.now() - 1200000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sessionQueue1: RemoteSession = {
      id: 'sess-q-101',
      ticket_id: ticket2.id,
      device_id: dev2.id,
      technician_id: '',
      session_token: 'TOKEN-QUEUE-REQ-8812',
      security_pin: '392817',
      status: RemoteSessionStatus.REQUESTED,
      authorized_by_client: false,
      permissions: {
        view_only: false,
        allow_input: true,
        allow_clipboard: true,
        allow_file_transfer: false,
        block_remote_input_during_uac: true,
      },
      screen_info: {
        monitors_count: 1,
        selected_monitor: 1,
        resolution: '1920x1080',
        color_depth: '24-bit TrueColor',
        scaling_factor_pct: 100,
      },
      crypto_spec: {
        cipher: 'AES-256-GCM',
        protocol: 'WebRTC DTLS 1.3 / SRTP',
        handshake_fingerprint: 'SHA256:4C:99:A1:33:EE:20:91:BB:72:08:3A:45:90:FD:11:82',
        key_rotation_interval_seconds: 3600,
      },
      telemetry: {
        current_fps: 0,
        bitrate_kbps: 0,
        rtt_latency_ms: 0,
        packet_loss_pct: 0,
        dirty_rects_pct: 0,
        bandwidth_saved_pct: 0,
        gpu_encoder: 'DirectX 11 DXGI Desktop Duplication',
        frames_rendered: 0,
      },
      duration_seconds: 0,
      quality_setting: 'Balanced',
      frame_rate: 30,
      client_ip: '192.168.1.112',
      technician_ip: '',
      created_at: new Date(Date.now() - 180000).toISOString(), // 3 mins ago
      updated_at: new Date(Date.now() - 180000).toISOString(),
    };

    const sessionQueue2: RemoteSession = {
      id: 'sess-q-102',
      ticket_id: ticket3.id,
      device_id: dev3.id,
      technician_id: '',
      session_token: 'TOKEN-QUEUE-CRIT-9904',
      security_pin: '750193',
      status: RemoteSessionStatus.REQUESTED,
      authorized_by_client: false,
      permissions: {
        view_only: false,
        allow_input: true,
        allow_clipboard: false,
        allow_file_transfer: false,
        block_remote_input_during_uac: true,
      },
      screen_info: {
        monitors_count: 1,
        selected_monitor: 1,
        resolution: '2560x1440',
        color_depth: '24-bit TrueColor',
        scaling_factor_pct: 125,
      },
      crypto_spec: {
        cipher: 'AES-256-GCM',
        protocol: 'WebRTC DTLS 1.3 / SRTP',
        handshake_fingerprint: 'SHA256:11:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66',
        key_rotation_interval_seconds: 3600,
      },
      telemetry: {
        current_fps: 0,
        bitrate_kbps: 0,
        rtt_latency_ms: 0,
        packet_loss_pct: 0,
        dirty_rects_pct: 0,
        bandwidth_saved_pct: 0,
        gpu_encoder: 'Intel QuickSync Video (DirectX 11 DXGI)',
        frames_rendered: 0,
      },
      duration_seconds: 0,
      quality_setting: 'High',
      frame_rate: 60,
      client_ip: '192.168.1.10',
      technician_ip: '',
      created_at: new Date(Date.now() - 45000).toISOString(), // 45s ago
      updated_at: new Date(Date.now() - 45000).toISOString(),
    };

    this.sessions.set(session1.id, session1);
    this.sessions.set(sessionQueue1.id, sessionQueue1);
    this.sessions.set(sessionQueue2.id, sessionQueue2);

    // 7. Seed Audit Logs
    this.logAudit(
      adminUser.id,
      'SYSTEM_BOOTSTRAP',
      'System',
      'SYS-001',
      { version: '1.0.0', mode: 'Phase 2 - Authentication & Authorization' },
      '127.0.0.1'
    );

    // 8. Seed Remote Drives & Virtual File System for Devices (FASE 9)
    this.seedVirtualFileSystem();

    // 9. Seed File Transfer Audit Logs
    this.seedFileTransferAudit();

    // 10. Seed Phase 10 Session Audit Trail & Structured Event Ledger
    this.seedSessionAuditRecords();
    this.seedAuditEvents();
  }

  public seedVirtualFileSystem() {
    const defaultDrives: RemoteDriveInfo[] = [
      {
        name: 'C:\\',
        label: 'Windows (SO / Sistema)',
        driveType: 'Fixed',
        totalBytes: 512110190592, // 512 GB
        freeBytes: 198642237440,  // 198 GB
        format: 'NTFS',
      },
      {
        name: 'D:\\',
        label: 'Datos & Respaldos ERP',
        driveType: 'Fixed',
        totalBytes: 1000204886016, // 1 TB
        freeBytes: 654211082240,   // 654 GB
        format: 'NTFS',
      },
      {
        name: 'E:\\',
        label: 'Unidad USB Recuperación',
        driveType: 'Removable',
        totalBytes: 64102842368,   // 64 GB
        freeBytes: 42100800000,    // 42 GB
        format: 'exFAT',
      },
    ];

    for (const dev of this.devices.values()) {
      this.deviceDrives.set(dev.id, defaultDrives);
      
      const files: RemoteFileItem[] = [
        // C:\ root items
        {
          name: 'ERP_Billing',
          path: 'C:\\ERP_Billing',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-14 18:22:10',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Program Files',
          path: 'C:\\Program Files',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-10 12:00:00',
          attributes: { isReadOnly: true, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: false, canDelete: false },
        },
        {
          name: 'Users',
          path: 'C:\\Users',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-01 09:30:15',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: false },
        },
        {
          name: 'Windows',
          path: 'C:\\Windows',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-12 14:15:30',
          attributes: { isReadOnly: true, isHidden: false, isSystem: true },
          permissions: { canRead: true, canWrite: false, canDelete: false },
        },
        {
          name: 'dump_crash_report.dmp',
          path: 'C:\\dump_crash_report.dmp',
          isDirectory: false,
          sizeBytes: 4421800,
          extension: '.dmp',
          modifiedDate: '2026-08-15 06:14:02',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\ERP_Billing items
        {
          name: 'database_config.ini',
          path: 'C:\\ERP_Billing\\database_config.ini',
          isDirectory: false,
          sizeBytes: 12450,
          extension: '.ini',
          modifiedDate: '2026-08-15 07:10:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'BillingService.exe',
          path: 'C:\\ERP_Billing\\BillingService.exe',
          isDirectory: false,
          sizeBytes: 1845200,
          extension: '.exe',
          modifiedDate: '2026-07-28 11:45:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Logs',
          path: 'C:\\ERP_Billing\\Logs',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-15 07:22:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Templates',
          path: 'C:\\ERP_Billing\\Templates',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-02 16:00:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\ERP_Billing\Logs items
        {
          name: 'error_20260815.log',
          path: 'C:\\ERP_Billing\\Logs\\error_20260815.log',
          isDirectory: false,
          sizeBytes: 84210,
          extension: '.log',
          modifiedDate: '2026-08-15 07:25:33',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'service_startup.log',
          path: 'C:\\ERP_Billing\\Logs\\service_startup.log',
          isDirectory: false,
          sizeBytes: 18600,
          extension: '.log',
          modifiedDate: '2026-08-15 06:00:10',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\Users items
        {
          name: 'jperez_rec',
          path: 'C:\\Users\\jperez_rec',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-15 07:00:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Administrator',
          path: 'C:\\Users\\Administrator',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-07-15 10:00:00',
          attributes: { isReadOnly: false, isHidden: true, isSystem: true },
          permissions: { canRead: true, canWrite: true, canDelete: false },
        },

        // C:\Users\jperez_rec items
        {
          name: 'Desktop',
          path: 'C:\\Users\\jperez_rec\\Desktop',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-15 07:15:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Downloads',
          path: 'C:\\Users\\jperez_rec\\Downloads',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-14 19:40:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Documents',
          path: 'C:\\Users\\jperez_rec\\Documents',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-13 11:20:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\Users\jperez_rec\Desktop items
        {
          name: 'Facturas_Pendientes_Agosto.pdf',
          path: 'C:\\Users\\jperez_rec\\Desktop\\Facturas_Pendientes_Agosto.pdf',
          isDirectory: false,
          sizeBytes: 1420500,
          extension: '.pdf',
          modifiedDate: '2026-08-15 06:45:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Reporte_Cierre_Caja.xlsx',
          path: 'C:\\Users\\jperez_rec\\Desktop\\Reporte_Cierre_Caja.xlsx',
          isDirectory: false,
          sizeBytes: 624100,
          extension: '.xlsx',
          modifiedDate: '2026-08-14 18:30:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Atajo_ERP_Facturacion.lnk',
          path: 'C:\\Users\\jperez_rec\\Desktop\\Atajo_ERP_Facturacion.lnk',
          isDirectory: false,
          sizeBytes: 1240,
          extension: '.lnk',
          modifiedDate: '2026-08-01 10:10:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\Users\jperez_rec\Downloads items
        {
          name: 'Hotfix_SQL_Driver_v4.msi',
          path: 'C:\\Users\\jperez_rec\\Downloads\\Hotfix_SQL_Driver_v4.msi',
          isDirectory: false,
          sizeBytes: 8850000,
          extension: '.msi',
          modifiedDate: '2026-08-14 15:10:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Manual_Instalacion.pdf',
          path: 'C:\\Users\\jperez_rec\\Downloads\\Manual_Instalacion.pdf',
          isDirectory: false,
          sizeBytes: 2340000,
          extension: '.pdf',
          modifiedDate: '2026-08-12 09:15:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // C:\Windows\Temp items
        {
          name: 'Temp',
          path: 'C:\\Windows\\Temp',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-15 07:20:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'rd_diag_dump_0815.dmp',
          path: 'C:\\Windows\\Temp\\rd_diag_dump_0815.dmp',
          isDirectory: false,
          sizeBytes: 4210000,
          extension: '.dmp',
          modifiedDate: '2026-08-15 07:18:22',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },

        // D:\ items
        {
          name: 'Backups',
          path: 'D:\\Backups',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-15 02:00:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'ERP_Full_Backup_20260814.bak',
          path: 'D:\\Backups\\ERP_Full_Backup_20260814.bak',
          isDirectory: false,
          sizeBytes: 142800000,
          extension: '.bak',
          modifiedDate: '2026-08-14 23:59:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'MySQL_Dump_20260815.sql',
          path: 'D:\\Backups\\MySQL_Dump_20260815.sql',
          isDirectory: false,
          sizeBytes: 36100000,
          extension: '.sql',
          modifiedDate: '2026-08-15 03:00:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
        {
          name: 'Shared_Depot',
          path: 'D:\\Shared_Depot',
          isDirectory: true,
          sizeBytes: 0,
          extension: '',
          modifiedDate: '2026-08-01 10:00:00',
          attributes: { isReadOnly: false, isHidden: false, isSystem: false },
          permissions: { canRead: true, canWrite: true, canDelete: true },
        },
      ];

      this.deviceFiles.set(dev.id, files);
    }
  }

  public seedFileTransferAudit() {
    const sampleAudits: FileTransferAuditRecord[] = [
      {
        id: 'ft-audit-101',
        timestamp: new Date(Date.now() - 4800000).toISOString(),
        sessionId: 'sess-active-001',
        ticketId: 't-1001',
        technicianName: 'Ing. Roberto Ramírez',
        customerCompany: 'Farmacias del Centro S.A.',
        deviceComputerName: 'RECEPCION-01',
        fileName: 'FixSQLFirewall_Patch_v2.ps1',
        sourcePath: 'Technician_Staging\\FixSQLFirewall_Patch_v2.ps1',
        destPath: 'C:\\Windows\\Temp\\FixSQLFirewall_Patch_v2.ps1',
        direction: 'UPLOAD',
        fileSizeBytes: 42100,
        sha256Checksum: '8e12a4b87c45d31298ff2a0134cd9812e45aa9820f1883bc209121a8f9024bc1',
        durationSeconds: 1.2,
        avgSpeedKbps: 28000,
        status: 'SUCCESS',
        clientApproved: true,
      },
      {
        id: 'ft-audit-102',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        sessionId: 'sess-active-001',
        ticketId: 't-1001',
        technicianName: 'Ing. Roberto Ramírez',
        customerCompany: 'Farmacias del Centro S.A.',
        deviceComputerName: 'RECEPCION-01',
        fileName: 'error_20260815.log',
        sourcePath: 'C:\\ERP_Billing\\Logs\\error_20260815.log',
        destPath: 'Technician_Diagnostics\\error_20260815.log',
        direction: 'DOWNLOAD',
        fileSizeBytes: 84210,
        sha256Checksum: '3a4f89b1c2d3e4f5061728394a5b6c7d8e9f0123456789abcdef0123456789ab',
        durationSeconds: 0.8,
        avgSpeedKbps: 35000,
        status: 'SUCCESS',
        clientApproved: true,
      },
      {
        id: 'ft-audit-103',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        sessionId: 'sess-active-001',
        ticketId: 't-1001',
        technicianName: 'Lic. Laura Fernández',
        customerCompany: 'Distribuidora Global Logística',
        deviceComputerName: 'ALMACEN-DESK-04',
        fileName: 'BillingPatch_v4.2.msi',
        sourcePath: 'Technician_Staging\\BillingPatch_v4.2.msi',
        destPath: 'C:\\Users\\jperez_rec\\Downloads\\BillingPatch_v4.2.msi',
        direction: 'UPLOAD',
        fileSizeBytes: 14800000,
        sha256Checksum: 'ef2489c71a34bc0981e421045daff781200984baac33219087114faeb0918234',
        durationSeconds: 4.6,
        avgSpeedKbps: 26000,
        status: 'SUCCESS',
        clientApproved: true,
      },
    ];

    this.fileAuditLogs = sampleAudits;
  }

  // --- Remote File System Operations (FASE 9) ---
  public getDrives(deviceId: string): RemoteDriveInfo[] {
    return this.deviceDrives.get(deviceId) || [
      {
        name: 'C:\\',
        label: 'Windows (C:)',
        driveType: 'Fixed',
        totalBytes: 512110190592,
        freeBytes: 198642237440,
        format: 'NTFS',
      },
    ];
  }

  public browseDirectory(deviceId: string, targetPath = 'C:\\'): {
    path: string;
    parentPath: string | null;
    items: RemoteFileItem[];
    drive: string;
  } {
    let normalizedPath = targetPath.trim();
    if (!normalizedPath.endsWith('\\') && normalizedPath.length === 2 && normalizedPath.endsWith(':')) {
      normalizedPath += '\\';
    }

    const drive = normalizedPath.substring(0, 3);
    const files = this.deviceFiles.get(deviceId) || [];

    // Filter direct children of targetPath
    const isRoot = normalizedPath === drive;
    let parentPath: string | null = null;
    if (!isRoot) {
      const parts = normalizedPath.replace(/\\$/, '').split('\\');
      if (parts.length > 1) {
        parts.pop();
        parentPath = parts.join('\\');
        if (parentPath.length === 2 && parentPath.endsWith(':')) {
          parentPath += '\\';
        }
      }
    }

    const directItems = files.filter((item) => {
      const itemDir = item.path.substring(0, item.path.lastIndexOf('\\')) || drive;
      const cleanItemDir = itemDir.endsWith('\\') ? itemDir : itemDir + '\\';
      const cleanTarget = normalizedPath.endsWith('\\') ? normalizedPath : normalizedPath + '\\';
      return cleanItemDir.toLowerCase() === cleanTarget.toLowerCase();
    });

    // Sort: directories first, then alphabetically by name
    directItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      path: normalizedPath,
      parentPath,
      items: directItems,
      drive,
    };
  }

  public createDirectory(deviceId: string, parentPath: string, folderName: string): RemoteFileItem {
    const cleanParent = parentPath.endsWith('\\') ? parentPath : parentPath + '\\';
    const newPath = cleanParent + folderName.trim();
    const files = this.deviceFiles.get(deviceId) || [];

    const newItem: RemoteFileItem = {
      name: folderName.trim(),
      path: newPath,
      isDirectory: true,
      sizeBytes: 0,
      extension: '',
      modifiedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      attributes: { isReadOnly: false, isHidden: false, isSystem: false },
      permissions: { canRead: true, canWrite: true, canDelete: true },
    };

    files.push(newItem);
    this.deviceFiles.set(deviceId, files);
    return newItem;
  }

  public deleteFileOrDirectory(deviceId: string, targetPath: string): boolean {
    const files = this.deviceFiles.get(deviceId) || [];
    const initialLen = files.length;
    const filtered = files.filter(
      (f) => f.path.toLowerCase() !== targetPath.toLowerCase() && !f.path.toLowerCase().startsWith(targetPath.toLowerCase() + '\\')
    );
    this.deviceFiles.set(deviceId, filtered);
    return filtered.length < initialLen;
  }

  public renameFileOrDirectory(deviceId: string, oldPath: string, newName: string): RemoteFileItem | null {
    const files = this.deviceFiles.get(deviceId) || [];
    const item = files.find((f) => f.path.toLowerCase() === oldPath.toLowerCase());
    if (!item) return null;

    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('\\'));
    const newPath = (parentDir.endsWith('\\') ? parentDir : parentDir + '\\') + newName.trim();

    item.name = newName.trim();
    item.path = newPath;
    item.modifiedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (!item.isDirectory) {
      const extMatch = newName.match(/\.[^.]+$/);
      item.extension = extMatch ? extMatch[0] : '';
    }

    return item;
  }

  public initFileTransfer(taskData: Partial<FileTransferTask>): FileTransferTask {
    const id = taskData.id || `ft-task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const chunkSize = taskData.chunkSizeBytes || 1024 * 64; // 64 KB default
    const totalChunks = Math.ceil((taskData.fileSizeBytes || 1024) / chunkSize);

    const task: FileTransferTask = {
      id,
      sessionId: taskData.sessionId || 'sess-active-001',
      ticketId: taskData.ticketId,
      deviceId: taskData.deviceId || 'dev-001',
      technicianId: taskData.technicianId || 'tech-001',
      fileName: taskData.fileName || 'transfer_file.dat',
      fileSizeBytes: taskData.fileSizeBytes || 1024,
      sourcePath: taskData.sourcePath || 'Source',
      destinationPath: taskData.destinationPath || 'C:\\Windows\\Temp',
      direction: taskData.direction || 'UPLOAD',
      status: 'TRANSFERRING',
      progressPct: 0,
      bytesTransferred: 0,
      speedKbps: 0,
      chunkSizeBytes: chunkSize,
      totalChunks,
      currentChunk: 0,
      sha256Expected: taskData.sha256Expected || '',
      sha256Calculated: '',
      sha256Verified: false,
      securityScanResult: 'SCANNING',
      securityScanDetails: 'Análisis de amenazas Win32 AMSI en curso...',
      startedAt: new Date().toISOString(),
    };

    this.fileTransfers.set(id, task);
    return task;
  }

  public logFileAudit(record: Omit<FileTransferAuditRecord, 'id' | 'timestamp'>): FileTransferAuditRecord {
    const fullRecord: FileTransferAuditRecord = {
      id: `ft-audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };
    this.fileAuditLogs.unshift(fullRecord);
    if (this.fileAuditLogs.length > 500) this.fileAuditLogs.pop();
    return fullRecord;
  }

  public logAudit(
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any>,
    ipAddress = '127.0.0.1'
  ): AuditLog {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    return log;
  }

  // --- Hydration Helpers ---
  public getHydratedTechnician(tech: Technician): Technician {
    const user = this.users.get(tech.user_id);
    return { ...tech, user };
  }

  public getHydratedTicket(ticket: SupportTicket): SupportTicket {
    const customer = this.customers.get(ticket.customer_id);
    const device = this.devices.get(ticket.device_id);
    let technician: Technician | undefined;
    if (ticket.technician_id) {
      technician = this.technicians.get(ticket.technician_id);
      if (technician) {
        const user = this.users.get(technician.user_id);
        technician = { ...technician, user };
      }
    }
    return { ...ticket, customer, device, technician };
  }

  public getHydratedSession(session: RemoteSession): RemoteSession {
    const ticket = this.tickets.get(session.ticket_id);
    const device = this.devices.get(session.device_id);
    const technician = this.technicians.get(session.technician_id);
    return {
      ...session,
      ticket: ticket ? this.getHydratedTicket(ticket) : undefined,
      device,
      technician,
    };
  }

  public generateTicketNumber(): string {
    this.ticketCounter += 1;
    return `TICK-${this.ticketCounter.toString().padStart(6, '0')}`;
  }

  // ==========================================
  // --- FASE 10: AUDITORÍA & LOGS INMUTABLES ---
  // ==========================================

  public computeHmacSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.hmacSecretKey)
      .update(payload)
      .digest('hex');
  }

  public recordAuditEvent(
    data: Omit<AuditEvent, 'id' | 'sequenceNumber' | 'hmacSignature' | 'previousBlockSha256' | 'verified'>
  ): AuditEvent {
    this.auditEventCounter += 1;
    const seq = this.auditEventCounter;
    const id = `audit-ev-${Date.now()}-${seq}`;
    const prevHash = this.lastBlockSha256;

    const rawBlockString = `${seq}|${data.timestamp}|${data.category}|${data.action}|${data.actor.id}|${data.actor.ip}|${data.target.entityId}|${JSON.stringify(data.details)}|${prevHash}`;
    const hmacSig = this.computeHmacSignature(rawBlockString);
    const blockSha256 = crypto.createHash('sha256').update(rawBlockString + hmacSig).digest('hex');
    this.lastBlockSha256 = blockSha256;

    const event: AuditEvent = {
      id,
      sequenceNumber: seq,
      timestamp: data.timestamp,
      category: data.category,
      action: data.action,
      actionTitle: data.actionTitle,
      severity: data.severity,
      actor: data.actor,
      target: data.target,
      details: data.details,
      diffs: data.diffs,
      hmacSignature: hmacSig,
      previousBlockSha256: prevHash,
      verified: true,
    };

    this.structuredAuditEvents.unshift(event);
    if (this.structuredAuditEvents.length > 1000) this.structuredAuditEvents.pop();
    return event;
  }

  public seedSessionAuditRecords() {
    const now = Date.now();
    const records: SessionAuditRecord[] = [
      {
        id: 'sar-001',
        sessionId: 'sess-active-001',
        ticketNumber: 'TICK-000101',
        ticketId: 't-1001',
        ticketCategory: 'Software / ERP / Facturación',
        customerId: 'cust-abc-01',
        customerCompany: 'ABC Solutions S.R.L.',
        customerContact: 'Juan Pérez (809-555-0199)',
        deviceId: 'dev-001',
        deviceComputerName: 'RECEPCION-01',
        deviceWindowsUser: 'jperez_rec',
        deviceIp: '192.168.1.105',
        deviceOs: 'Windows 11 Pro 23H2 (Build 22631.3880)',
        technicianId: 'tech-001',
        technicianName: 'Ing. Roberto Ramírez',
        technicianEmail: 'roberto.soporte@remotedesk.com',
        technicianIp: '200.88.45.12',
        startedAt: new Date(now - 1200000).toISOString(), // 20m ago
        endedAt: new Date(now - 60000).toISOString(),     // 1m ago
        durationSeconds: 1140,
        resolution: '1920x1080 @ 60 Hz (Monitor 1)',
        avgFps: 59.4,
        avgBitrateKbps: 4180,
        bandwidthSavedPct: 82.4,
        keystrokesCount: 342,
        mouseClicksCount: 128,
        fileTransfersCount: 2,
        bytesTransferred: 126310,
        terminationReason: 'SLA_RESOLVED',
        clientConsentProof: {
          granted: true,
          pinUsed: '849201',
          consentTimestamp: new Date(now - 1200000).toISOString(),
          clientIp: '192.168.1.105',
          consentType: 'PIN_AUTH_6_DIGIT',
        },
        hmacSignature: this.computeHmacSignature('sess-active-001|t-1001|tech-001|RECEPCION-01|192.168.1.105|200.88.45.12|1140'),
        complianceStandards: ['ISO 27001 A.12.4.1', 'SOC 2 CC6.1', 'HIPAA 164.312(b)'],
        notes: 'Desbloqueado servicio Windows de SQL Server Express. Parche FixSQLFirewall_Patch_v2.ps1 aplicado exitosamente.',
      },
      {
        id: 'sar-002',
        sessionId: 'sess-hist-102',
        ticketNumber: 'TICK-000102',
        ticketId: 't-1002',
        ticketCategory: 'Impresoras & Periféricos',
        customerId: 'cust-global-02',
        customerCompany: 'Global Logística Express',
        customerContact: 'Dra. Carmen Vega (809-555-0844)',
        deviceId: 'dev-002',
        deviceComputerName: 'ALMACEN-DESK-04',
        deviceWindowsUser: 'operador_zebra',
        deviceIp: '192.168.1.112',
        deviceOs: 'Windows 10 Pro 22H2 (Build 19045.4651)',
        technicianId: 'tech-002',
        technicianName: 'Lic. Laura Fernández',
        technicianEmail: 'laura.soporte@remotedesk.com',
        technicianIp: '200.88.45.14',
        startedAt: new Date(now - 86400000 * 1.5).toISOString(), // 1.5 days ago
        endedAt: new Date(now - 86400000 * 1.5 + 1800000).toISOString(),
        durationSeconds: 1800,
        resolution: '1920x1080 @ 30 Hz (Monitor 1)',
        avgFps: 29.8,
        avgBitrateKbps: 2400,
        bandwidthSavedPct: 79.1,
        keystrokesCount: 180,
        mouseClicksCount: 94,
        fileTransfersCount: 1,
        bytesTransferred: 14800000,
        terminationReason: 'SLA_RESOLVED',
        clientConsentProof: {
          granted: true,
          pinUsed: '392817',
          consentTimestamp: new Date(now - 86400000 * 1.5).toISOString(),
          clientIp: '192.168.1.112',
          consentType: 'DESKTOP_POPUP_CLICK',
        },
        hmacSignature: this.computeHmacSignature('sess-hist-102|t-1002|tech-002|ALMACEN-DESK-04|192.168.1.112|200.88.45.14|1800'),
        complianceStandards: ['ISO 27001 A.12.4.1', 'SOC 2 CC6.1'],
        notes: 'Reinstalado controlador ZDesigner ZT410 y purgada cola Spooler de Windows.',
      },
      {
        id: 'sar-003',
        sessionId: 'sess-hist-103',
        ticketNumber: 'TICK-000103',
        ticketId: 't-1003',
        ticketCategory: 'Seguridad / Antivirus',
        customerId: 'cust-abc-01',
        customerCompany: 'ABC Solutions S.R.L.',
        customerContact: 'Ing. Carlos Méndez (809-555-0322)',
        deviceId: 'dev-003',
        deviceComputerName: 'SRV-BACKUP-01',
        deviceWindowsUser: 'Administrator',
        deviceIp: '192.168.1.10',
        deviceOs: 'Windows Server 2022 Datacenter',
        technicianId: 'tech-001',
        technicianName: 'Ing. Roberto Ramírez',
        technicianEmail: 'roberto.soporte@remotedesk.com',
        technicianIp: '200.88.45.12',
        startedAt: new Date(now - 86400000 * 3).toISOString(), // 3 days ago
        endedAt: new Date(now - 86400000 * 3 + 3600000).toISOString(),
        durationSeconds: 3600,
        resolution: '2560x1440 @ 60 Hz (Dual Screen)',
        avgFps: 58.2,
        avgBitrateKbps: 6500,
        bandwidthSavedPct: 86.5,
        keystrokesCount: 890,
        mouseClicksCount: 310,
        fileTransfersCount: 3,
        bytesTransferred: 182000000,
        terminationReason: 'TECHNICIAN_CLOSED',
        clientConsentProof: {
          granted: true,
          pinUsed: '750193',
          consentTimestamp: new Date(now - 86400000 * 3).toISOString(),
          clientIp: '192.168.1.10',
          consentType: 'UAC_ELEVATED',
        },
        hmacSignature: this.computeHmacSignature('sess-hist-103|t-1003|tech-001|SRV-BACKUP-01|192.168.1.10|200.88.45.12|3600'),
        complianceStandards: ['ISO 27001 A.12.4.1', 'SOC 2 CC6.1', 'PCI-DSS 10.2'],
        notes: 'Verificación de integridad de réplica VSS y actualización de certificados SSL TLS 1.3.',
      },
      {
        id: 'sar-004',
        sessionId: 'sess-hist-104',
        ticketNumber: 'TICK-000098',
        ticketId: 't-1098',
        ticketCategory: 'Redes & Internet',
        customerId: 'cust-farm-03',
        customerCompany: 'Farmacias del Centro S.A.',
        customerContact: 'Dra. María Almonte (809-555-0911)',
        deviceId: 'dev-004',
        deviceComputerName: 'CAJA-SUCURSAL-02',
        deviceWindowsUser: 'cajero_noche',
        deviceIp: '192.168.10.45',
        deviceOs: 'Windows 10 IoT Enterprise',
        technicianId: 'tech-002',
        technicianName: 'Lic. Laura Fernández',
        technicianEmail: 'laura.soporte@remotedesk.com',
        technicianIp: '200.88.45.14',
        startedAt: new Date(now - 86400000 * 5).toISOString(),
        endedAt: new Date(now - 86400000 * 5 + 900000).toISOString(),
        durationSeconds: 900,
        resolution: '1366x768 @ 60 Hz',
        avgFps: 59.9,
        avgBitrateKbps: 1800,
        bandwidthSavedPct: 88.0,
        keystrokesCount: 110,
        mouseClicksCount: 45,
        fileTransfersCount: 0,
        bytesTransferred: 0,
        terminationReason: 'SLA_RESOLVED',
        clientConsentProof: {
          granted: true,
          pinUsed: '194820',
          consentTimestamp: new Date(now - 86400000 * 5).toISOString(),
          clientIp: '192.168.10.45',
          consentType: 'PIN_AUTH_6_DIGIT',
        },
        hmacSignature: this.computeHmacSignature('sess-hist-104|t-1098|tech-002|CAJA-SUCURSAL-02|192.168.10.45|200.88.45.14|900'),
        complianceStandards: ['ISO 27001 A.12.4.1', 'PCI-DSS 10.2'],
        notes: 'Ajuste de Gateway DNS primario e IP estática para terminal POS Verifone.',
      },
    ];

    this.sessionAuditRecords = records;
  }

  public seedAuditEvents() {
    const now = Date.now();

    // Chronological sequence of events
    const initialEvents = [
      {
        timestamp: new Date(now - 86400000 * 4).toISOString(),
        category: 'AUTH' as AuditActionCategory,
        action: 'AUTH_USER_LOGIN_SUCCESS',
        actionTitle: 'Inicio de sesión exitoso de Administrador',
        severity: 'info' as const,
        actor: {
          id: 'u-1001-admin',
          name: 'Ing. Carlos Mendoza',
          role: 'Admin' as const,
          ip: '200.88.45.10',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        },
        target: {
          entityType: 'User' as const,
          entityId: 'u-1001-admin',
          label: 'Admin Portal',
        },
        details: {
          method: 'JWT_BEARER',
          mfaVerified: true,
          sessionId: 'auth-sess-991',
        },
      },
      {
        timestamp: new Date(now - 86400000 * 3.8).toISOString(),
        category: 'DEVICE_ACTION' as AuditActionCategory,
        action: 'DEVICE_HWID_REGISTERED',
        actionTitle: 'Registro y vinculación de nuevo endpoint Windows',
        severity: 'info' as const,
        actor: {
          id: 'agent-dev-001',
          name: 'RemoteDesk Windows Service',
          role: 'WindowsAgent' as const,
          ip: '192.168.1.105',
        },
        target: {
          entityType: 'Device' as const,
          entityId: 'dev-001',
          label: 'RECEPCION-01',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
        },
        details: {
          cpuHwid: 'BFEBFBFF00090672',
          motherboardGuid: 'MB-ASUS-Z690-994182',
          osBuild: 'Windows 11 Pro (22631.3880)',
        },
      },
      {
        timestamp: new Date(now - 86400000 * 3.5).toISOString(),
        category: 'TICKET_CHANGE' as AuditActionCategory,
        action: 'TICKET_CREATED',
        actionTitle: 'Creación de ticket de soporte #TICK-000101',
        severity: 'info' as const,
        actor: {
          id: 'u-1004-cust1',
          name: 'Juan Pérez (ABC Solutions)',
          role: 'Customer' as const,
          ip: '192.168.1.105',
        },
        target: {
          entityType: 'SupportTicket' as const,
          entityId: 't-1001',
          label: 'TICK-000101: Error de conexión SQL ERP',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
          ticketNumber: 'TICK-000101',
        },
        details: {
          priority: 'Alta',
          category: 'Software / ERP / Facturación',
          initialStatus: 'Pendiente',
        },
      },
      {
        timestamp: new Date(now - 86400000 * 3.4).toISOString(),
        category: 'TICKET_CHANGE' as AuditActionCategory,
        action: 'TICKET_ASSIGNED',
        actionTitle: 'Asignación de técnico a ticket #TICK-000101',
        severity: 'info' as const,
        actor: {
          id: 'u-1001-admin',
          name: 'Ing. Carlos Mendoza',
          role: 'Admin' as const,
          ip: '200.88.45.10',
        },
        target: {
          entityType: 'SupportTicket' as const,
          entityId: 't-1001',
          label: 'TICK-000101',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          ticketNumber: 'TICK-000101',
        },
        details: {
          assignedTechnician: 'Ing. Roberto Ramírez (tech-001)',
          specialty: 'Sistemas Windows & Redes',
        },
        diffs: [
          { field: 'technician_id', before: null, after: 'tech-001' },
          { field: 'status', before: 'Pendiente', after: 'Asignado' },
        ],
      },
      {
        timestamp: new Date(now - 86400000 * 2.5).toISOString(),
        category: 'SESSION' as AuditActionCategory,
        action: 'REMOTE_SESSION_STARTED',
        actionTitle: 'Inicio de control remoto seguro DXGI (AES-256-GCM)',
        severity: 'info' as const,
        actor: {
          id: 'u-1002-tech1',
          name: 'Ing. Roberto Ramírez',
          role: 'Technician' as const,
          ip: '200.88.45.12',
        },
        target: {
          entityType: 'RemoteSession' as const,
          entityId: 'sess-active-001',
          label: 'Sesión Remota en RECEPCION-01',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
          ticketNumber: 'TICK-000101',
        },
        details: {
          clientIp: '192.168.1.105',
          technicianIp: '200.88.45.12',
          protocol: 'WebRTC DTLS 1.3 / SRTP',
          cipher: 'AES-256-GCM',
          clientConsentPin: '849201',
          consentVerified: true,
        },
      },
      {
        timestamp: new Date(now - 86400000 * 2.4).toISOString(),
        category: 'FILE_TRANSFER' as AuditActionCategory,
        action: 'FILE_UPLOAD_COMPLETED',
        actionTitle: 'Transferencia de archivo: FixSQLFirewall_Patch_v2.ps1',
        severity: 'info' as const,
        actor: {
          id: 'u-1002-tech1',
          name: 'Ing. Roberto Ramírez',
          role: 'Technician' as const,
          ip: '200.88.45.12',
        },
        target: {
          entityType: 'FileTransfer' as const,
          entityId: 'ft-audit-101',
          label: 'FixSQLFirewall_Patch_v2.ps1 -> C:\\Windows\\Temp',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
        },
        details: {
          fileSizeBytes: 42100,
          sha256Checksum: '8e12a4b87c45d31298ff2a0134cd9812e45aa9820f1883bc209121a8f9024bc1',
          amsiScanResult: 'CLEAN',
          durationSeconds: 1.2,
        },
      },
      {
        timestamp: new Date(now - 86400000 * 2.2).toISOString(),
        category: 'DEVICE_ACTION' as AuditActionCategory,
        action: 'DEVICE_POWERSHELL_EXECUTED',
        actionTitle: 'Ejecución de script de diagnóstico PowerShell en endpoint',
        severity: 'info' as const,
        actor: {
          id: 'u-1002-tech1',
          name: 'Ing. Roberto Ramírez',
          role: 'Technician' as const,
          ip: '200.88.45.12',
        },
        target: {
          entityType: 'Device' as const,
          entityId: 'dev-001',
          label: 'RECEPCION-01',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
        },
        details: {
          command: 'Restart-Service -Name "MSSQL$SQLEXPRESS" -Force',
          executionOutput: 'Service restarted successfully. Status: Running. PID: 4192.',
          exitCode: 0,
        },
      },
      {
        timestamp: new Date(now - 86400000 * 2.0).toISOString(),
        category: 'SESSION' as AuditActionCategory,
        action: 'REMOTE_SESSION_ENDED',
        actionTitle: 'Finalización de sesión remota con consentimiento del cliente',
        severity: 'success' as const,
        actor: {
          id: 'u-1002-tech1',
          name: 'Ing. Roberto Ramírez',
          role: 'Technician' as const,
          ip: '200.88.45.12',
        },
        target: {
          entityType: 'RemoteSession' as const,
          entityId: 'sess-active-001',
          label: 'Sesión Finalizada en RECEPCION-01',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          deviceId: 'dev-001',
          deviceName: 'RECEPCION-01',
          ticketNumber: 'TICK-000101',
        },
        details: {
          durationSeconds: 1140,
          terminationReason: 'SLA_RESOLVED',
          avgFps: 59.4,
          bandwidthSavedPct: 82.4,
          resolutionNotes: 'Problema solucionado satisfactoriamente.',
        },
      },
      {
        timestamp: new Date(now - 86400000 * 1.9).toISOString(),
        category: 'TICKET_CHANGE' as AuditActionCategory,
        action: 'TICKET_RESOLVED',
        actionTitle: 'Resolución de ticket de soporte #TICK-000101',
        severity: 'success' as const,
        actor: {
          id: 'u-1002-tech1',
          name: 'Ing. Roberto Ramírez',
          role: 'Technician' as const,
          ip: '200.88.45.12',
        },
        target: {
          entityType: 'SupportTicket' as const,
          entityId: 't-1001',
          label: 'TICK-000101',
          customerId: 'cust-abc-01',
          customerName: 'ABC Solutions S.R.L.',
          ticketNumber: 'TICK-000101',
        },
        details: {
          resolutionNotes: 'Se restableció el servicio SQL Server y se ajustó la regla de firewall en puerto 1433.',
          resolutionTimeMinutes: 45,
          slaComplied: true,
        },
        diffs: [
          { field: 'status', before: 'En progreso', after: 'Resuelto' },
          { field: 'resolved_at', before: null, after: new Date(now - 86400000 * 1.9).toISOString() },
        ],
      },
      {
        timestamp: new Date(now - 86400000 * 1.2).toISOString(),
        category: 'SECURITY_ALERT' as AuditActionCategory,
        action: 'AMSI_SUSPICIOUS_EXTENSION_BLOCKED',
        actionTitle: 'Protección AMSI: Intento de subida de archivo .vbs bloqueado',
        severity: 'warning' as const,
        actor: {
          id: 'agent-dev-002',
          name: 'Windows Defender AMSI Bridge',
          role: 'WindowsAgent' as const,
          ip: '192.168.1.112',
        },
        target: {
          entityType: 'FileTransfer' as const,
          entityId: 'ft-blocked-901',
          label: 'script_obfuscated.vbs -> C:\\Windows\\Temp',
          customerId: 'cust-global-02',
          customerName: 'Global Logística Express',
          deviceId: 'dev-002',
          deviceName: 'ALMACEN-DESK-04',
        },
        details: {
          policyViolation: 'EXTENSION_POLICY_BLOCKED (.vbs scripts require Tier-3 admin authorization)',
          scannedHashSha256: '99a41b2289c011e4f901172834ba9910cbe44199aa7710294811a0bb33420199',
          actionTaken: 'TRANSFER_REJECTED_AT_RECEIVER',
        },
      },
      {
        timestamp: new Date(now - 3600000).toISOString(), // 1 hr ago
        category: 'SYSTEM_POLICY' as AuditActionCategory,
        action: 'SECURITY_POLICY_UPDATED',
        actionTitle: 'Actualización de política de cifrado de sesiones (WebRTC DTLS 1.3 Obligatorio)',
        severity: 'info' as const,
        actor: {
          id: 'u-1001-admin',
          name: 'Ing. Carlos Mendoza',
          role: 'Admin' as const,
          ip: '200.88.45.10',
        },
        target: {
          entityType: 'System' as const,
          entityId: 'SYS-POLICY-CRYPTO',
          label: 'Configuración Criptográfica Global',
        },
        details: {
          enforceDtls13: true,
          requireSixDigitPin: true,
          maxIdleTimeoutMinutes: 15,
        },
      },
    ];

    for (const ev of initialEvents) {
      this.recordAuditEvent(ev);
    }
  }

  public getStructuredAuditEvents(filters?: {
    category?: string;
    severity?: string;
    search?: string;
    actorId?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): {
    events: AuditEvent[];
    total: number;
    categoriesSummary: Record<string, number>;
  } {
    let result = [...this.structuredAuditEvents];

    if (filters?.category && filters.category !== 'ALL') {
      result = result.filter((e) => e.category === filters.category);
    }

    if (filters?.severity) {
      result = result.filter((e) => e.severity === filters.severity);
    }

    if (filters?.actorId) {
      result = result.filter((e) => e.actor.id === filters.actorId);
    }

    if (filters?.entityType) {
      result = result.filter((e) => e.target.entityType === filters.entityType);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.actionTitle.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q) ||
          e.actor.ip.toLowerCase().includes(q) ||
          e.target.label.toLowerCase().includes(q) ||
          (e.target.customerName && e.target.customerName.toLowerCase().includes(q)) ||
          (e.target.ticketNumber && e.target.ticketNumber.toLowerCase().includes(q))
      );
    }

    const categoriesSummary: Record<string, number> = {
      ALL: this.structuredAuditEvents.length,
      SESSION: 0,
      TICKET_CHANGE: 0,
      FILE_TRANSFER: 0,
      DEVICE_ACTION: 0,
      AUTH: 0,
      SECURITY_ALERT: 0,
      SYSTEM_POLICY: 0,
    };

    for (const ev of this.structuredAuditEvents) {
      if (categoriesSummary[ev.category] !== undefined) {
        categoriesSummary[ev.category] += 1;
      }
    }

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    const paginated = result.slice(offset, offset + limit);

    return {
      events: paginated,
      total,
      categoriesSummary,
    };
  }

  public getSessionAuditRecords(filters?: {
    customerId?: string;
    technicianId?: string;
    search?: string;
    terminationReason?: string;
  }): SessionAuditRecord[] {
    let result = [...this.sessionAuditRecords];

    if (filters?.customerId) {
      result = result.filter((r) => r.customerId === filters.customerId);
    }

    if (filters?.technicianId) {
      result = result.filter((r) => r.technicianId === filters.technicianId);
    }

    if (filters?.terminationReason) {
      result = result.filter((r) => r.terminationReason === filters.terminationReason);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.ticketNumber.toLowerCase().includes(q) ||
          r.customerCompany.toLowerCase().includes(q) ||
          r.deviceComputerName.toLowerCase().includes(q) ||
          r.technicianName.toLowerCase().includes(q) ||
          r.deviceIp.toLowerCase().includes(q) ||
          r.technicianIp.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public generateCustomerServiceReport(customerId: string, periodLabel = 'Últimos 30 días'): CustomerServiceReportSummary {
    const customer = this.customers.get(customerId) || Array.from(this.customers.values())[0];
    const customerTickets = Array.from(this.tickets.values())
      .filter((t) => t.customer_id === customer.id)
      .map((t) => this.getHydratedTicket(t));

    const customerSessions = this.sessionAuditRecords.filter((s) => s.customerId === customer.id);
    const resolvedTickets = customerTickets.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED);
    const openTickets = customerTickets.filter((t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED);

    // SLA Calculation
    let slaCompliedCount = 0;
    for (const t of customerTickets) {
      if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
        slaCompliedCount += 1;
      }
    }
    const slaCompliancePct = customerTickets.length > 0 ? Math.round((slaCompliedCount / customerTickets.length) * 100) : 100;
    const slaViolatedCount = customerTickets.length - slaCompliedCount;

    // Minutes and Bytes
    const totalRemoteMinutes = customerSessions.reduce((acc, s) => acc + Math.round(s.durationSeconds / 60), 0);
    const filesTransferredCount = customerSessions.reduce((acc, s) => acc + s.fileTransfersCount, 0);
    const totalBytesTransferred = customerSessions.reduce((acc, s) => acc + s.bytesTransferred, 0);
    const criticalIncidentsCount = customerTickets.filter((t) => t.priority === TicketPriority.CRITICAL).length;

    // Categorization
    const ticketsByCategory: Record<string, number> = {};
    const ticketsByPriority: Record<string, number> = {};

    for (const t of customerTickets) {
      const cat = t.category || 'General';
      ticketsByCategory[cat] = (ticketsByCategory[cat] || 0) + 1;

      const prio = t.priority;
      ticketsByPriority[prio] = (ticketsByPriority[prio] || 0) + 1;
    }

    // Technicians involved stats
    const techMap = new Map<string, { technicianId: string; technicianName: string; specialty: string; ticketsHandled: number; sessionMinutes: number; satisfactionRating: number }>();

    for (const t of customerTickets) {
      if (t.technician) {
        const techId = t.technician.id;
        const current = techMap.get(techId) || {
          technicianId: techId,
          technicianName: t.technician.user?.full_name || 'Técnico Especialista',
          specialty: t.technician.specialty,
          ticketsHandled: 0,
          sessionMinutes: 0,
          satisfactionRating: 4.9,
        };
        current.ticketsHandled += 1;
        techMap.set(techId, current);
      }
    }

    for (const s of customerSessions) {
      const current = techMap.get(s.technicianId);
      if (current) {
        current.sessionMinutes += Math.round(s.durationSeconds / 60);
      }
    }

    const techniciansInvolved = Array.from(techMap.values());
    if (techniciansInvolved.length === 0) {
      const firstTech = Array.from(this.technicians.values())[0];
      const hydrated = this.getHydratedTechnician(firstTech);
      techniciansInvolved.push({
        technicianId: hydrated.id,
        technicianName: hydrated.user?.full_name || 'Ing. Roberto Ramírez',
        specialty: hydrated.specialty,
        ticketsHandled: customerTickets.length,
        sessionMinutes: totalRemoteMinutes,
        satisfactionRating: 5.0,
      });
    }

    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    return {
      periodLabel,
      startDate,
      endDate,
      customerId: customer.id,
      customerCompany: customer.company_name,
      customerContact: customer.contact_name,
      customerEmail: customer.email,
      kpis: {
        totalTickets: customerTickets.length,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        slaCompliancePct,
        slaViolatedCount,
        avgFirstResponseMinutes: 8,
        avgResolutionHours: 1.4,
        totalRemoteSessions: customerSessions.length,
        totalRemoteMinutes,
        filesTransferredCount,
        totalBytesTransferred,
        criticalIncidentsCount,
      },
      ticketsByCategory,
      ticketsByPriority,
      techniciansInvolved,
      recentTickets: customerTickets.slice(0, 10),
      sessionHistory: customerSessions,
      generatedAt: new Date().toISOString(),
      reportId: `REP-${customer.id.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    };
  }

  public verifyAuditChain(): AuditChainVerificationResult {
    let isValid = true;
    let tamperedCount = 0;
    const tamperedIds: string[] = [];

    // Chronological verification from oldest (end of array) to newest (start of array)
    const reversed = [...this.structuredAuditEvents].reverse();

    for (let i = 0; i < reversed.length; i++) {
      const block = reversed[i];
      const prevBlock = i > 0 ? reversed[i - 1] : null;
      const expectedPrevHash = prevBlock
        ? crypto.createHash('sha256').update(
            `${prevBlock.sequenceNumber}|${prevBlock.timestamp}|${prevBlock.category}|${prevBlock.action}|${prevBlock.actor.id}|${prevBlock.actor.ip}|${prevBlock.target.entityId}|${JSON.stringify(prevBlock.details)}|${prevBlock.previousBlockSha256}` + prevBlock.hmacSignature
          ).digest('hex')
        : '0000000000000000000000000000000000000000000000000000000000000000';

      const rawBlockString = `${block.sequenceNumber}|${block.timestamp}|${block.category}|${block.action}|${block.actor.id}|${block.actor.ip}|${block.target.entityId}|${JSON.stringify(block.details)}|${block.previousBlockSha256}`;
      const calculatedHmac = this.computeHmacSignature(rawBlockString);

      if (calculatedHmac !== block.hmacSignature || (i > 0 && block.previousBlockSha256 !== expectedPrevHash)) {
        isValid = false;
        tamperedCount += 1;
        tamperedIds.push(block.id);
      }
    }

    return {
      isValid,
      totalBlocksVerified: this.structuredAuditEvents.length,
      tamperedBlocksCount: tamperedCount,
      tamperedBlockIds: tamperedIds,
      algorithm: 'HMAC-SHA256 Chained Merkle-Linked Ledger',
      rootGenesisHash: '0000000000000000000000000000000000000000000000000000000000000000',
      latestBlockHash: this.lastBlockSha256,
      verifiedAt: new Date().toISOString(),
    };
  }
}

export const db = new DatabaseStore();

