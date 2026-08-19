using System;
using System.Windows;
using System.Windows.Threading;

namespace RemoteDesk.Client.UI
{
    /// <summary>
    /// Indicador flotante superior (Top Banner Overlay) mostrado durante la sesión remota activa.
    /// Permite al cliente saber en todo momento quién está conectado y finalizar el soporte inmediatamente.
    /// </summary>
    public class FloatingSessionBanner : Window
    {
        private readonly Func<Task> _onTerminateSession;
        private readonly DispatcherTimer _timer;
        private int _elapsedSeconds = 0;

        public string TechnicianName { get; }

        public FloatingSessionBanner(string technicianName, Func<Task> onTerminateSession)
        {
            TechnicianName = technicianName;
            _onTerminateSession = onTerminateSession;

            Title = "Soporte Remoto Activo";
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Topmost = true;
            Width = 520;
            Height = 54;
            Left = (SystemParameters.PrimaryScreenWidth - 520) / 2;
            Top = 10;
            ShowInTaskbar = false;

            _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _timer.Tick += (s, e) => _elapsedSeconds++;
            _timer.Start();
        }

        public async void OnTerminateClicked(object sender, RoutedEventArgs e)
        {
            _timer.Stop();
            await _onTerminateSession();
            Close();
        }
    }
}
