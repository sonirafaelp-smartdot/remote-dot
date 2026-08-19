using System;
using System.Windows;
using System.Windows.Media.Animation;

namespace RemoteDesk.Client.UI
{
    /// <summary>
    /// Ventana de Confirmación y Consentimiento Explícito del Usuario.
    /// Según requisitos de seguridad, ningún técnico puede tomar control sin la aprobación activa del cliente.
    /// </summary>
    public class AuthorizationDialog : Window
    {
        public string TechnicianName { get; }
        public string SystemBrand { get; }

        public AuthorizationDialog(string technicianName, string systemBrand)
        {
            TechnicianName = technicianName;
            SystemBrand = systemBrand;

            Title = $"{SystemBrand} - Solicitud de Control Remoto";
            Width = 480;
            Height = 320;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Topmost = true; // Asegura visibilidad sobre todas las ventanas
            ResizeMode = ResizeMode.NoResize;

            // XAML markup o construcción programática de controles
        }

        public void OnAllowClicked(object sender, RoutedEventArgs e)
        {
            DialogResult = true;
            Close();
        }

        public void OnDenyClicked(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
