export const signalRHubCode = `// ==============================================================================
// RemoteDesk Enterprise - SignalR Real-Time Notification Hub (.NET 9 / C#)
// Archivo: NotificationHub.cs
// ==============================================================================

using System;
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace RemoteDesk.Server.Hubs
{
    public interface IRemoteDeskClient
    {
        Task ReceiveNotification(NotificationPayload notification);
        Task OnTicketCreated(TicketNotificationDto ticket);
        Task OnTicketUpdated(TicketNotificationDto ticket);
        Task OnDeviceStatusChanged(DeviceStatusDto deviceStatus);
        Task OnRemoteSessionRequested(RemoteSessionPromptDto session);
        Task OnRemoteSessionTerminated(string sessionId, string reason);
        Task OnSlaWarning(SlaWarningDto warning);
    }

    [Authorize]
    public class NotificationHub : Hub<IRemoteDeskClient>
    {
        private readonly ILogger<NotificationHub> _logger;
        private static readonly ConcurrentDictionary<string, ConnectedUser> ConnectedClients = new();

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Context.ConnectionId;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value ?? "Client";
            var companyId = Context.User?.FindFirst("CompanyId")?.Value ?? "DefaultCompany";

            var client = new ConnectedUser
            {
                ConnectionId = Context.ConnectionId,
                UserId = userId,
                Role = role,
                CompanyId = companyId,
                ConnectedAt = DateTime.UtcNow
            };

            ConnectedClients[Context.ConnectionId] = client;

            // Automatically join role and company channels
            if (role == "Technician" || role == "Admin")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "TechniciansChannel");
                _logger.LogInformation($"[SignalR] Técnico {userId} suscrito al canal 'TechniciansChannel'");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Company_{companyId}");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectedClients.TryRemove(Context.ConnectionId, out var client))
            {
                _logger.LogInformation($"[SignalR] Cliente desconectado: {client.UserId} ({Context.ConnectionId})");
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Send instant notification to all active technicians
        public async Task BroadcastToTechnicians(NotificationPayload notification)
        {
            await Clients.Group("TechniciansChannel").ReceiveNotification(notification);
        }

        // Notify client machine of an incoming remote support request
        public async Task RequestRemoteAccess(string targetDeviceId, RemoteSessionPromptDto prompt)
        {
            await Clients.Group($"Device_{targetDeviceId}").OnRemoteSessionRequested(prompt);
        }
    }

    public record NotificationPayload(
        string Id,
        string Type,
        string Topic,
        string Severity,
        string Title,
        string Message,
        DateTime Timestamp,
        object? Data = null
    );

    public record DeviceStatusDto(string DeviceId, string ComputerName, bool IsOnline, DateTime LastHeartbeat);
    public record TicketNotificationDto(string TicketId, string TicketNumber, string Priority, string CustomerName, string ProblemDescription);
    public record RemoteSessionPromptDto(string SessionId, string SessionToken, string TechnicianName, int ExpiresInSeconds);
    public record SlaWarningDto(string TicketNumber, int MinutesRemaining, string Priority);

    public class ConnectedUser
    {
        public required string ConnectionId { get; set; }
        public required string UserId { get; set; }
        public required string Role { get; set; }
        public required string CompanyId { get; set; }
        public DateTime ConnectedAt { get; set; }
    }
}`;

export const csharpClientCode = `// ==============================================================================
// RemoteDesk Enterprise - Agente Windows Cliente C# .NET 9
// Archivo: RealtimeNotificationClient.cs (WPF & Servicio NT en Segundo Plano)
// ==============================================================================

using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Toolkit.Uwp.Notifications; // Windows 10/11 Toast Notifications
using System.Media;

namespace RemoteDesk.Client.Realtime
{
    public class RealtimeNotificationClient : IAsyncDisposable
    {
        private HubConnection? _hubConnection;
        private readonly string _serverUrl;
        private readonly string _authToken;
        private readonly string _deviceId;
        private bool _isMuted = false;

        public event Action<string, string, string>? OnNotificationReceived;
        public event Action<bool>? OnConnectionStatusChanged;

        public RealtimeNotificationClient(string serverUrl, string authToken, string deviceId)
        {
            _serverUrl = serverUrl;
            _authToken = authToken;
            _deviceId = deviceId;
        }

        public async Task StartAsync(CancellationToken cancellationToken = default)
        {
            _hubConnection = new HubConnectionBuilder()
                .WithUrl($"{_serverUrl}/hubs/notifications", options =>
                {
                    options.AccessTokenProvider = () => Task.FromResult<string?>(_authToken);
                    options.Headers.Add("X-Device-HWID", _deviceId);
                })
                .WithAutomaticReconnect(new[] {
                    TimeSpan.Zero,
                    TimeSpan.FromSeconds(2),
                    TimeSpan.FromSeconds(5),
                    TimeSpan.FromSeconds(10),
                    TimeSpan.FromSeconds(30)
                })
                .Build();

            // Handlers for incoming events from the server
            _hubConnection.On<NotificationPayload>("ReceiveNotification", (payload) =>
            {
                HandleIncomingNotification(payload);
            });

            _hubConnection.On<RemoteSessionPromptDto>("OnRemoteSessionRequested", (prompt) =>
            {
                TriggerRemoteSessionConsentDialog(prompt);
            });

            _hubConnection.Reconnecting += (error) =>
            {
                OnConnectionStatusChanged?.Invoke(false);
                return Task.CompletedTask;
            };

            _hubConnection.Reconnected += (connectionId) =>
            {
                OnConnectionStatusChanged?.Invoke(true);
                return Task.CompletedTask;
            };

            _hubConnection.Closed += (error) =>
            {
                OnConnectionStatusChanged?.Invoke(false);
                return Task.CompletedTask;
            };

            await _hubConnection.StartAsync(cancellationToken);
            OnConnectionStatusChanged?.Invoke(true);
        }

        private void HandleIncomingNotification(NotificationPayload payload)
        {
            OnNotificationReceived?.Invoke(payload.Title, payload.Message, payload.Severity);

            // Native Windows 11 Toast Notification
            try
            {
                new ToastContentBuilder()
                    .AddText(payload.Title)
                    .AddText(payload.Message)
                    .AddAttributionText("RemoteDesk Enterprise")
                    .Show();
            }
            catch
            {
                // Fallback for NT Services without desktop shell
            }

            // Audio Alert if severity is Critical or Warning
            if (!_isMuted && (payload.Severity == "critical" || payload.Severity == "warning"))
            {
                SystemSounds.Exclamation.Play();
            }
        }

        private void TriggerRemoteSessionConsentDialog(RemoteSessionPromptDto prompt)
        {
            // Disparar ventana modal interactiva en WPF para solicitar autorización del usuario
            App.Current.Dispatcher.Invoke(() =>
            {
                var consentWindow = new Windows.RemoteConsentDialog(prompt);
                consentWindow.ShowDialog();
            });
        }

        public async ValueTask DisposeAsync()
        {
            if (_hubConnection != null)
            {
                await _hubConnection.DisposeAsync();
            }
        }
    }
}`;
