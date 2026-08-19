using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RemoteDesk.Server.Data
{
    public enum UserRole
    {
        Admin,
        Technician,
        Customer
    }

    public enum TicketPriority
    {
        Baja,
        Media,
        Alta,
        Critica
    }

    public enum TicketStatus
    {
        Pendiente,
        Asignado,
        EnProgreso,
        EsperandoCliente,
        Resuelto,
        Cerrado
    }

    public enum RemoteSessionStatus
    {
        EsperandoTecnico,
        TecnicoAsignado,
        SesionAutorizada,
        SesionActiva,
        SesionFinalizada,
        SesionRevocada,
        Rechazada
    }

    [Table("users")]
    public class User
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(255)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Column("role")]
        public UserRole Role { get; set; } = UserRole.Customer;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Technician? TechnicianProfile { get; set; }
    }

    [Table("technicians")]
    public class Technician
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        [MaxLength(100)]
        [Column("specialty")]
        public string Specialty { get; set; } = "Soporte General";

        [Column("is_online")]
        public bool IsOnline { get; set; } = false;

        [Column("max_concurrent_sessions")]
        public int MaxConcurrentSessions { get; set; } = 3;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("customers")]
    public class Customer
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        [Column("company_name")]
        public string CompanyName { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("contact_name")]
        public string ContactName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("phone")]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("address")]
        public string? Address { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Device> Devices { get; set; } = new List<Device>();
    }

    [Table("devices")]
    public class Device
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("customer_id")]
        public Guid CustomerId { get; set; }

        [ForeignKey(nameof(CustomerId))]
        public Customer Customer { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        [Column("device_uuid")]
        public string DeviceUuid { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("computer_name")]
        public string ComputerName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("windows_user")]
        public string WindowsUser { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("os_version")]
        public string OsVersion { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("cpu")]
        public string Cpu { get; set; } = string.Empty;

        [Column("ram_mb")]
        public int RamMb { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("storage_info")]
        public string StorageInfo { get; set; } = string.Empty;

        [Required]
        [MaxLength(45)]
        [Column("ip_address")]
        public string IpAddress { get; set; } = string.Empty;

        [MaxLength(50)]
        [Column("mac_address")]
        public string? MacAddress { get; set; }

        [Column("is_online")]
        public bool IsOnline { get; set; } = false;

        [Column("last_heartbeat")]
        public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;

        [MaxLength(20)]
        [Column("agent_version")]
        public string AgentVersion { get; set; } = "1.0.0";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("support_tickets")]
    public class SupportTicket
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(30)]
        [Column("ticket_number")]
        public string TicketNumber { get; set; } = string.Empty;

        [Required]
        [Column("customer_id")]
        public Guid CustomerId { get; set; }

        [ForeignKey(nameof(CustomerId))]
        public Customer Customer { get; set; } = null!;

        [Required]
        [Column("device_id")]
        public Guid DeviceId { get; set; }

        [ForeignKey(nameof(DeviceId))]
        public Device Device { get; set; } = null!;

        [Column("requested_by_user_id")]
        public Guid? RequestedByUserId { get; set; }

        [Column("technician_id")]
        public Guid? TechnicianId { get; set; }

        [ForeignKey(nameof(TechnicianId))]
        public Technician? Technician { get; set; }

        [Required]
        [Column("problem_description")]
        public string ProblemDescription { get; set; } = string.Empty;

        [Column("priority")]
        public TicketPriority Priority { get; set; } = TicketPriority.Media;

        [Column("status")]
        public TicketStatus Status { get; set; } = TicketStatus.Pendiente;

        [Column("resolution_notes")]
        public string? ResolutionNotes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("remote_sessions")]
    public class RemoteSession
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("ticket_id")]
        public Guid TicketId { get; set; }

        [ForeignKey(nameof(TicketId))]
        public SupportTicket Ticket { get; set; } = null!;

        [Required]
        [Column("device_id")]
        public Guid DeviceId { get; set; }

        [ForeignKey(nameof(DeviceId))]
        public Device Device { get; set; } = null!;

        [Required]
        [Column("technician_id")]
        public Guid TechnicianId { get; set; }

        [ForeignKey(nameof(TechnicianId))]
        public Technician Technician { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        [Column("session_token")]
        public string SessionToken { get; set; } = string.Empty;

        [Column("status")]
        public RemoteSessionStatus Status { get; set; } = RemoteSessionStatus.EsperandoTecnico;

        [Column("authorized_by_client")]
        public bool AuthorizedByClient { get; set; } = false;

        [Column("started_at")]
        public DateTime? StartedAt { get; set; }

        [Column("ended_at")]
        public DateTime? EndedAt { get; set; }

        [Column("duration_seconds")]
        public int DurationSeconds { get; set; } = 0;

        [MaxLength(20)]
        [Column("quality_setting")]
        public string QualitySetting { get; set; } = "Balanced";

        [Column("frame_rate")]
        public int FrameRate { get; set; } = 30;

        [MaxLength(45)]
        [Column("client_ip")]
        public string ClientIp { get; set; } = string.Empty;

        [MaxLength(45)]
        [Column("technician_ip")]
        public string TechnicianIp { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("audit_logs")]
    public class AuditLog
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid? UserId { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("action")]
        public string Action { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("entity_type")]
        public string EntityType { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("entity_id")]
        public string EntityId { get; set; } = string.Empty;

        [Column("details", TypeName = "jsonb")]
        public string DetailsJson { get; set; } = "{}";

        [MaxLength(45)]
        [Column("ip_address")]
        public string? IpAddress { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Device>()
                .HasIndex(d => d.DeviceUuid)
                .IsUnique();

            modelBuilder.Entity<SupportTicket>()
                .HasIndex(t => t.TicketNumber)
                .IsUnique();

            modelBuilder.Entity<RemoteSession>()
                .HasIndex(s => s.SessionToken)
                .IsUnique();
        }
    }
}
