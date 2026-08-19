using System;

namespace RemoteDesk.Client.Config
{
    /// <summary>
    /// Configuración personalizable del Agente de Soporte para Windows.
    /// Permite a las empresas revender o personalizar el nombre de su servicio de mesa de ayuda (White-labeling).
    /// </summary>
    public class AgentConfig
    {
        // Personalización de Marca (Branding)
        public string BrandName { get; set; } = "RemoteDesk Enterprise";
        public string SupportPhone { get; set; } = "+1 (809) 555-0199";
        public string SupportEmail { get; set; } = "soporte@tuempresa.com";
        public string CompanyPortalUrl { get; set; } = "https://soporte.tuempresa.com";

        // Conexión Central
        public string ServerBaseUrl { get; set; } = "https://ais-dev-brelpf65wdh2qfo2hi6djd-450241481745.us-west1.run.app";
        public string WebSocketUrl { get; set; } = "wss://ais-dev-brelpf65wdh2qfo2hi6djd-450241481745.us-west1.run.app/ws";
        public string EnrollmentToken { get; set; } = "ENROLL-CUST-ABC-01-SECURE";

        // Parámetros de Operación
        public int HeartbeatIntervalSeconds { get; set; } = 30;
        public int SessionPollIntervalSeconds { get; set; } = 3;
        public bool RequireExplicitUserConsent { get; set; } = true;
        public bool PlayAudioOnIncomingConnection { get; set; } = true;
        public bool MinimizeToTrayOnClose { get; set; } = true;
        public string AgentVersion { get; set; } = "1.2.0";
    }
}
