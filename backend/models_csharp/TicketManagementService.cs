using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace RemoteDesk.Enterprise.Tickets
{
    public enum TicketPriority
    {
        Baja = 1,
        Media = 2,
        Alta = 3,
        Critica = 4
    }

    public enum TicketStatus
    {
        Pendiente = 0,
        Asignado = 1,
        EnProgreso = 2,
        EsperandoCliente = 3,
        Resuelto = 4,
        Cerrado = 5
    }

    public enum TicketCategory
    {
        SoftwareErp = 1,
        RedesInternet = 2,
        ImpresorasPerifericos = 3,
        SistemaOperativoWindows = 4,
        SeguridadAntivirus = 5,
        CuentasAccesos = 6,
        General = 7
    }

    public class TicketCommentDto
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string TicketId { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorRole { get; set; } = "Technician"; // Technician, Customer, Admin, System
        public string? AuthorId { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsInternalNote { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SupportTicketModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string TicketNumber { get; set; } = string.Empty; // e.g. TICK-000125
        public string CustomerId { get; set; } = string.Empty;
        public string DeviceId { get; set; } = string.Empty;
        public string? RequestedByUserId { get; set; }
        public string ContactName { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
        public string? TechnicianId { get; set; }
        public TicketCategory Category { get; set; } = TicketCategory.General;
        public string ProblemDescription { get; set; } = string.Empty;
        public TicketPriority Priority { get; set; } = TicketPriority.Media;
        public TicketStatus Status { get; set; } = TicketStatus.Pendiente;
        public string? ResolutionNotes { get; set; }
        public DateTime SlaDueAt { get; set; }
        public DateTime? FirstRespondedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public List<TicketCommentDto> Comments { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Service for handling enterprise support tickets, lifecycle management, SLA monitoring and notifications.
    /// </summary>
    public class TicketManagementService
    {
        private static long _ticketSequence = 1000;
        private readonly List<SupportTicketModel> _tickets = new();
        private readonly object _lock = new();

        public static string GenerateTicketNumber()
        {
            var next = Interlocked.Increment(ref _ticketSequence);
            return $"TICK-{next:D6}";
        }

        public static DateTime CalculateSlaDueDate(TicketPriority priority)
        {
            return priority switch
            {
                TicketPriority.Critica => DateTime.UtcNow.AddHours(2),
                TicketPriority.Alta => DateTime.UtcNow.AddHours(6),
                TicketPriority.Media => DateTime.UtcNow.AddHours(24),
                TicketPriority.Baja => DateTime.UtcNow.AddHours(48),
                _ => DateTime.UtcNow.AddHours(24)
            };
        }

        public SupportTicketModel CreateTicket(
            string customerId,
            string deviceId,
            string problemDescription,
            TicketPriority priority,
            TicketCategory category,
            string contactName,
            string contactInfo,
            string? requestedByUserId = null)
        {
            lock (_lock)
            {
                var ticket = new SupportTicketModel
                {
                    Id = $"t-{Guid.NewGuid():N}",
                    TicketNumber = GenerateTicketNumber(),
                    CustomerId = customerId,
                    DeviceId = deviceId,
                    ProblemDescription = problemDescription,
                    Priority = priority,
                    Category = category,
                    ContactName = contactName,
                    ContactInfo = contactInfo,
                    RequestedByUserId = requestedByUserId,
                    Status = TicketStatus.Pendiente,
                    SlaDueAt = CalculateSlaDueDate(priority),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _tickets.Add(ticket);
                return ticket;
            }
        }

        public SupportTicketModel? AssignTechnician(string ticketId, string technicianId)
        {
            lock (_lock)
            {
                var ticket = _tickets.FirstOrDefault(t => t.Id == ticketId);
                if (ticket == null) return null;

                ticket.TechnicianId = technicianId;
                ticket.Status = TicketStatus.EnProgreso;
                ticket.FirstRespondedAt ??= DateTime.UtcNow;
                ticket.UpdatedAt = DateTime.UtcNow;

                return ticket;
            }
        }

        public TicketCommentDto? AddComment(
            string ticketId,
            string authorName,
            string authorRole,
            string message,
            bool isInternalNote,
            string? authorId = null)
        {
            lock (_lock)
            {
                var ticket = _tickets.FirstOrDefault(t => t.Id == ticketId);
                if (ticket == null) return null;

                var comment = new TicketCommentDto
                {
                    TicketId = ticketId,
                    AuthorName = authorName,
                    AuthorRole = authorRole,
                    AuthorId = authorId,
                    Message = message,
                    IsInternalNote = isInternalNote,
                    CreatedAt = DateTime.UtcNow
                };

                ticket.Comments.Add(comment);
                ticket.UpdatedAt = DateTime.UtcNow;
                return comment;
            }
        }

        public SupportTicketModel? ResolveTicket(string ticketId, string resolutionNotes)
        {
            lock (_lock)
            {
                var ticket = _tickets.FirstOrDefault(t => t.Id == ticketId);
                if (ticket == null) return null;

                ticket.Status = TicketStatus.Resuelto;
                ticket.ResolutionNotes = resolutionNotes;
                ticket.ResolvedAt = DateTime.UtcNow;
                ticket.UpdatedAt = DateTime.UtcNow;

                return ticket;
            }
        }

        public SupportTicketModel? CloseTicket(string ticketId, string? finalNotes = null)
        {
            lock (_lock)
            {
                var ticket = _tickets.FirstOrDefault(t => t.Id == ticketId);
                if (ticket == null) return null;

                ticket.Status = TicketStatus.Cerrado;
                ticket.ClosedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(finalNotes))
                {
                    ticket.ResolutionNotes += $"\n[Cierre]: {finalNotes}";
                }
                ticket.UpdatedAt = DateTime.UtcNow;

                return ticket;
            }
        }

        public SupportTicketModel? ReopenTicket(string ticketId, string reason)
        {
            lock (_lock)
            {
                var ticket = _tickets.FirstOrDefault(t => t.Id == ticketId);
                if (ticket == null) return null;

                ticket.Status = TicketStatus.EnProgreso;
                ticket.ResolvedAt = null;
                ticket.ClosedAt = null;
                ticket.UpdatedAt = DateTime.UtcNow;

                ticket.Comments.Add(new TicketCommentDto
                {
                    TicketId = ticketId,
                    AuthorName = "Sistema / Helpdesk",
                    AuthorRole = "System",
                    Message = $"Reapertura de ticket: {reason}",
                    IsInternalNote = false,
                    CreatedAt = DateTime.UtcNow
                });

                return ticket;
            }
        }

        public IEnumerable<SupportTicketModel> QueryTickets(
            TicketStatus? status = null,
            TicketPriority? priority = null,
            string? customerId = null,
            string? technicianId = null,
            string? searchTerm = null)
        {
            lock (_lock)
            {
                var query = _tickets.AsQueryable();

                if (status.HasValue)
                    query = query.Where(t => t.Status == status.Value);

                if (priority.HasValue)
                    query = query.Where(t => t.Priority == priority.Value);

                if (!string.IsNullOrEmpty(customerId))
                    query = query.Where(t => t.CustomerId == customerId);

                if (!string.IsNullOrEmpty(technicianId))
                    query = query.Where(t => t.TechnicianId == technicianId);

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    var term = searchTerm.Trim().ToLowerInvariant();
                    query = query.Where(t =>
                        t.TicketNumber.ToLowerInvariant().Contains(term) ||
                        t.ProblemDescription.ToLowerInvariant().Contains(term) ||
                        t.ContactName.ToLowerInvariant().Contains(term));
                }

                return query.OrderByDescending(t => t.CreatedAt).ToList();
            }
        }
    }
}
