using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Forms; // NotifyIcon
using System.Windows.Media;
using System.Windows.Threading;
using RemoteDesk.Client.Config;
using RemoteDesk.Client.Utils;

namespace RemoteDesk.Client.UI
{
    public enum AgentState
    {
        Connected,          // Conectado al servidor (Listo)
        WaitingTechnician,  // Esperando técnico (Ticket enviado)
        TechnicianConnected,// Técnico conectado (Soporte activo)
        SessionEnded        // Sesión finalizada
    }

    /// <summary>
    /// Ventana Principal de la Aplicación del Cliente Windows (WPF .NET 9).
    /// </summary>
    public partial class AgentMainWindow : Window
    {
        private readonly AgentConfig _config;
        private readonly HttpClient _httpClient;
        private readonly NotifyIcon _notifyIcon;
        private readonly DispatcherTimer _pollTimer;

        private AgentState _currentState = AgentState.Connected;
        private string? _currentTicketId;
        private string? _currentTicketNumber;
        private string? _currentSessionId;
        private string? _connectedTechName;

        public AgentMainWindow()
        {
            _config = new AgentConfig();
            _httpClient = new HttpClient { BaseUrl = new Uri(_config.ServerBaseUrl) };

            // Inicializar System Tray
            _notifyIcon = new NotifyIcon
            {
                Text = $"{_config.BrandName} - Agente de Soporte",
                Visible = true
            };
            SetupTrayMenu();

            // Polling para detectar asignación de técnicos en segundo plano
            _pollTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(_config.SessionPollIntervalSeconds)
            };
            _pollTimer.Tick += async (s, e) => await CheckActiveSessionStatusAsync();
            _pollTimer.Start();

            UpdateUiForState(AgentState.Connected);
        }

        private void SetupTrayMenu()
        {
            var menu = new ContextMenuStrip();
            menu.Items.Add("Abrir Ventana de Soporte", null, (s, e) => ShowAndRestore());
            menu.Items.Add("Solicitar Soporte Técnico", null, (s, e) => { ShowAndRestore(); FocusSupportForm(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir del Agente", null, (s, e) => { _notifyIcon.Visible = false; System.Windows.Application.Current.Shutdown(); });
            _notifyIcon.ContextMenuStrip = menu;
            _notifyIcon.DoubleClick += (s, e) => ShowAndRestore();
        }

        private void ShowAndRestore()
        {
            Show();
            WindowState = WindowState.Normal;
            Activate();
        }

        /// <summary>
        /// Manejador del botón principal: "SOLICITAR SOPORTE"
        /// </summary>
        public async Task RequestSupportAsync(string contactName, string contactInfo, string problemDesc, string priority)
        {
            if (string.IsNullOrWhiteSpace(problemDesc))
            {
                System.Windows.MessageBox.Show("Por favor detalle una breve descripción del problema.", "Campo requerido", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                var payload = new
                {
                    device_id = "dev-auto",
                    contact_name = contactName,
                    contact_info = contactInfo,
                    problem_description = problemDesc,
                    priority = priority
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/v1/tickets", content);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    _currentTicketId = doc.RootElement.GetProperty("id").GetString();
                    _currentTicketNumber = doc.RootElement.GetProperty("ticket_number").GetString();

                    UpdateUiForState(AgentState.WaitingTechnician);
                    _notifyIcon.ShowBalloonTip(4000, "Solicitud Enviada", $"Ticket {_currentTicketNumber} registrado. En breve un técnico atenderá su solicitud.", ToolTipIcon.Info);
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"Error al enviar la solicitud: {ex.Message}", "Error de Conexión", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        /// <summary>
        /// Verifica si un técnico ha tomado el ticket y solicita conectarse
        /// </summary>
        private async Task CheckActiveSessionStatusAsync()
        {
            if (_currentState != AgentState.WaitingTechnician) return;

            try
            {
                var response = await _httpClient.GetAsync($"/api/v1/sessions/device/dev-auto/active");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("session", out var sessionProp) && sessionProp.ValueKind != JsonValueKind.Null)
                    {
                        var status = sessionProp.GetProperty("status").GetString();
                        _currentSessionId = sessionProp.GetProperty("id").GetString();
                        var techName = sessionProp.GetProperty("technician").GetProperty("user").GetProperty("full_name").GetString();
                        _connectedTechName = techName;

                        if (status == "Técnico asignado")
                        {
                            _pollTimer.Stop();
                            PromptUserAuthorization(techName ?? "Técnico Especialista");
                        }
                    }
                }
            }
            catch { }
        }

        /// <summary>
        /// Muestra el modal de confirmación obligatoria con alerta sonora
        /// </summary>
        private void PromptUserAuthorization(string techName)
        {
            // Reproducir sonido de atención
            AudioNotificationHelper.PlayIncomingConnectionAlert();

            var dialog = new AuthorizationDialog(techName, _config.BrandName);
            bool? result = dialog.ShowDialog();

            if (result == true)
            {
                // Usuario autorizó la sesión
                _ = AuthorizeSessionAsync(_currentSessionId!);
            }
            else
            {
                // Usuario rechazó el acceso
                _ = RejectSessionAsync(_currentSessionId!);
            }
        }

        private async Task AuthorizeSessionAsync(string sessionId)
        {
            try
            {
                var response = await _httpClient.PostAsync($"/api/v1/sessions/{sessionId}/authorize", null);
                if (response.IsSuccessStatusCode)
                {
                    UpdateUiForState(AgentState.TechnicianConnected);
                    ShowFloatingSessionBanner(_connectedTechName ?? "Técnico Asignado");
                }
            }
            catch { }
        }

        private async Task RejectSessionAsync(string sessionId)
        {
            try
            {
                var content = new StringContent(JsonSerializer.Serialize(new { reason = "El usuario rechazó la conexión remota" }), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"/api/v1/sessions/{sessionId}/reject", content);
                UpdateUiForState(AgentState.Connected);
                _pollTimer.Start();
            }
            catch { }
        }

        public async Task TerminateSessionAsync()
        {
            if (string.IsNullOrEmpty(_currentSessionId)) return;

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(new { terminated_by = "Cliente", reason = "Sesión finalizada por el usuario" }), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"/api/v1/sessions/{_currentSessionId}/terminate", content);

                AudioNotificationHelper.PlaySessionEndedSound();
                CloseFloatingSessionBanner();
                UpdateUiForState(AgentState.SessionEnded);
            }
            catch { }
        }

        private void UpdateUiForState(AgentState state)
        {
            _currentState = state;
            // Actualiza indicadores visuales en la interfaz
        }

        private void ShowFloatingSessionBanner(string techName)
        {
            var banner = new FloatingSessionBanner(techName, async () => await TerminateSessionAsync());
            banner.Show();
        }

        private void CloseFloatingSessionBanner()
        {
            // Cierra la barra flotante superior
        }

        private void FocusSupportForm() { }
    }
}
