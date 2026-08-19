using System;
using System.IO;
using System.Net.Http;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RemoteDesk.Client.Config;
using RemoteDesk.Client.Hardware;

namespace RemoteDesk.Client.Services
{
    /// <summary>
    /// Servicio de Windows en segundo plano (NT Service) ejecutándose bajo la cuenta SYSTEM o Usuario Local.
    /// Mantiene el túnel de comunicación con el servidor central y monitorea el estado del equipo.
    /// </summary>
    public class AgentWindowsService : BackgroundService
    {
        private readonly ILogger<AgentWindowsService> _logger;
        private readonly AgentConfig _config;
        private readonly HttpClient _httpClient;
        private string? _deviceId;
        private ClientWebSocket? _webSocket;

        public AgentWindowsService(ILogger<AgentWindowsService> logger, AgentConfig config)
        {
            _logger = logger;
            _config = config;
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Iniciando servicio de fondo RemoteDesk Agent v{Version}...", _config.AgentVersion);

            // 1. Enrolar o registrar HWID en el servidor
            await EnsureDeviceEnrolledAsync(stoppingToken);

            // 2. Iniciar bucle de latidos y conexión WebSocket
            var heartbeatTask = RunHeartbeatLoopAsync(stoppingToken);
            var webSocketTask = RunWebSocketListenerAsync(stoppingToken);

            await Task.WhenAll(heartbeatTask, webSocketTask);
        }

        private async Task EnsureDeviceEnrolledAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested && string.IsNullOrEmpty(_deviceId))
            {
                try
                {
                    var telemetry = HardwareTelemetryCollector.CollectFullTelemetry();
                    var payload = new
                    {
                        enrollment_token = _config.EnrollmentToken,
                        device_uuid = telemetry.DeviceUuid,
                        computer_name = telemetry.ComputerName,
                        windows_user = telemetry.WindowsUser,
                        os_version = telemetry.OsVersion,
                        cpu = telemetry.CpuModel,
                        ram_mb = telemetry.RamTotalMb,
                        storage_info = telemetry.StorageInfo,
                        ip_address = telemetry.LocalIpAddress,
                        mac_address = telemetry.MacAddress,
                        agent_version = _config.AgentVersion
                    };

                    var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync($"{_config.ServerBaseUrl}/api/v1/devices/register", content, ct);

                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(ct);
                        using var doc = JsonDocument.Parse(json);
                        _deviceId = doc.RootElement.GetProperty("device").GetProperty("id").GetString();
                        _logger.LogInformation("Equipo registrado con éxito en el servidor central. DeviceID: {DeviceId}", _deviceId);
                        return;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Reintentando enrolamiento en 10s: {Message}", ex.Message);
                }

                await Task.Delay(TimeSpan.FromSeconds(10), ct);
            }
        }

        private async Task RunHeartbeatLoopAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    if (!string.IsNullOrEmpty(_deviceId))
                    {
                        var heartbeatData = new
                        {
                            current_windows_user = Environment.UserName,
                            cpu_load_pct = 8,
                            ram_used_mb = 4100,
                            storage_free_gb = 190
                        };

                        var content = new StringContent(JsonSerializer.Serialize(heartbeatData), Encoding.UTF8, "application/json");
                        await _httpClient.PostAsync($"{_config.ServerBaseUrl}/api/v1/devices/{_deviceId}/heartbeat", content, ct);
                    }
                }
                catch { }

                await Task.Delay(TimeSpan.FromSeconds(_config.HeartbeatIntervalSeconds), ct);
            }
        }

        private async Task RunWebSocketListenerAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    _webSocket = new ClientWebSocket();
                    var wsUri = new Uri($"{_config.WebSocketUrl}?deviceId={_deviceId}&type=agent");
                    await _webSocket.ConnectAsync(wsUri, ct);
                    _logger.LogInformation("WebSocket conectado al servidor de señalización.");

                    var buffer = new byte[4096];
                    while (_webSocket.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", ct);
                            break;
                        }

                        var messageText = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        ProcessIncomingCommand(messageText);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("WebSocket desconectado. Reconectando en 5s: {Message}", ex.Message);
                }

                await Task.Delay(TimeSpan.FromSeconds(5), ct);
            }
        }

        private void ProcessIncomingCommand(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("type", out var typeProp))
                {
                    var type = typeProp.GetString();
                    if (type == "TECHNICIAN_CONNECTION_REQUEST")
                    {
                        var techName = root.GetProperty("technician_name").GetString();
                        var sessionId = root.GetProperty("session_id").GetString();
                        _logger.LogInformation("Solicitud de conexión remota del técnico {Tech} para la sesión {SessionId}", techName, sessionId);

                        // Lanzar diálogo de autorización en sesión interactiva de Windows
                        // (WPF / Notification Manager)
                    }
                }
            }
            catch { }
        }
    }
}
