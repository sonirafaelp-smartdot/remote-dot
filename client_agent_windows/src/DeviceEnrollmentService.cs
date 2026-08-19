using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace RemoteDesk.Client.Services
{
    /// <summary>
    /// Servicio de enrolamiento y latidos (Heartbeats) en segundo plano para el Agente Windows.
    /// </summary>
    public class DeviceEnrollmentService
    {
        private readonly HttpClient _httpClient;
        private readonly string _serverBaseUrl;
        private readonly string _enrollmentToken;
        private Timer? _heartbeatTimer;
        private string? _registeredDeviceId;

        public DeviceEnrollmentService(string serverBaseUrl, string enrollmentToken)
        {
            _serverBaseUrl = serverBaseUrl.TrimEnd('/');
            _enrollmentToken = enrollmentToken;
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        }

        /// <summary>
        /// Registra o actualiza la computadora en el Servidor Central con el token de cliente.
        /// </summary>
        public async Task<bool> EnrollDeviceAsync()
        {
            try
            {
                var telemetry = Hardware.HardwareTelemetryCollector.CollectFullTelemetry();

                var payload = new
                {
                    enrollment_token = _enrollmentToken,
                    device_uuid = telemetry.DeviceUuid,
                    computer_name = telemetry.ComputerName,
                    windows_user = telemetry.WindowsUser,
                    os_version = telemetry.OsVersion,
                    cpu = telemetry.CpuModel,
                    ram_mb = telemetry.RamTotalMb,
                    storage_info = telemetry.StorageInfo,
                    ip_address = telemetry.LocalIpAddress,
                    mac_address = telemetry.MacAddress,
                    agent_version = telemetry.AgentVersion
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_serverBaseUrl}/api/v1/devices/register", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseJson);
                    _registeredDeviceId = doc.RootElement.GetProperty("device").GetProperty("id").GetString();

                    Console.WriteLine($"[Enrolamiento Exitoso] ID: {_registeredDeviceId} - Equipo: {telemetry.ComputerName}");
                    StartHeartbeatLoop();
                    return true;
                }
                else
                {
                    Console.WriteLine($"[Error de Enrolamiento] Código: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Fallo de Conexión] {ex.Message}");
                return false;
            }
        }

        private void StartHeartbeatLoop()
        {
            // Heartbeat cada 30 segundos
            _heartbeatTimer = new Timer(async _ => await SendHeartbeatAsync(), null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
        }

        private async Task SendHeartbeatAsync()
        {
            if (string.IsNullOrEmpty(_registeredDeviceId)) return;

            try
            {
                var heartbeatPayload = new
                {
                    cpu_load_pct = 12,
                    ram_used_mb = 4500,
                    current_windows_user = Environment.UserName,
                    storage_free_gb = 240
                };

                var content = new StringContent(JsonSerializer.Serialize(heartbeatPayload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"{_serverBaseUrl}/api/v1/devices/{_registeredDeviceId}/heartbeat", content);
            }
            catch { }
        }
    }
}
