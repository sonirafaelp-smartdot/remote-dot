using System;
using System.Media;
using System.Threading.Tasks;

namespace RemoteDesk.Client.Utils
{
    /// <summary>
    /// Reproducción de alertas sonoras y llamadas de atención en Windows al recibir solicitudes de conexión.
    /// </summary>
    public static class AudioNotificationHelper
    {
        public static void PlayIncomingConnectionAlert()
        {
            Task.Run(() =>
            {
                try
                {
                    // Reproduce sonido del sistema de Windows (Exclamation / Asterisk) o Beep secuencial
                    SystemSounds.Exclamation.Play();
                    System.Threading.Thread.Sleep(300);
                    SystemSounds.Asterisk.Play();
                }
                catch
                {
                    try
                    {
                        Console.Beep(880, 200); // Tono A5
                        Console.Beep(1046, 300); // Tono C6
                    }
                    catch { }
                }
            });
        }

        public static void PlaySessionEndedSound()
        {
            Task.Run(() =>
            {
                try
                {
                    SystemSounds.Hand.Play();
                }
                catch
                {
                    try
                    {
                        Console.Beep(659, 250);
                        Console.Beep(523, 400);
                    }
                    catch { }
                }
            });
        }
    }
}
