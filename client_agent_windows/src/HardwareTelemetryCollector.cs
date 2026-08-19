using System;
using System.IO;
using System.Linq;
using System.Management; // NuGet package: System.Management
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;

namespace RemoteDesk.Client.Hardware
{
    /// <summary>
    /// Telemetría y extracción de Hardware ID (HWID) único para Windows (.NET 8/9).
    /// Utiliza WMI (Windows Management Instrumentation) para consultar placa madre, CPU, RAM y discos.
    /// </summary>
    public class HardwareTelemetryCollector
    {
        public class SystemTelemetryReport
        {
            public string DeviceUuid { get; set; } = string.Empty;
            public string ComputerName { get; set; } = string.Empty;
            public string WindowsUser { get; set; } = string.Empty;
            public string OsVersion { get; set; } = string.Empty;
            public string CpuModel { get; set; } = string.Empty;
            public int RamTotalMb { get; set; }
            public int RamFreeMb { get; set; }
            public string StorageInfo { get; set; } = string.Empty;
            public string LocalIpAddress { get; set; } = string.Empty;
            public string MacAddress { get; set; } = string.Empty;
            public string AgentVersion { get; set; } = "1.0.0";
        }

        /// <summary>
        /// Genera el HWID determinista e inmutable basado en los componentes físicos del equipo.
        /// </summary>
        public static string GenerateDeterministicHwid()
        {
            try
            {
                string mbUuid = GetWmiValue("Win32_BaseBoard", "SerialNumber");
                string cpuId = GetWmiValue("Win32_Processor", "ProcessorId");
                string biosSerial = GetWmiValue("Win32_BIOS", "SerialNumber");
                string mac = GetPrimaryMacAddress();

                string rawSeed = $"{mbUuid}::{cpuId}::{biosSerial}::{mac}";
                using var sha256 = SHA256.Create();
                byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawSeed));
                string hex = BitConverter.ToString(hashBytes).Replace("-", "").ToUpperInvariant();

                return $"WIN-{hex.Substring(0, 4)}-{hex.Substring(4, 4)}-{hex.Substring(8, 4)}-{hex.Substring(12, 4)}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HWID Fallback] {ex.Message}");
                return $"WIN-FALLBACK-{Environment.MachineName.ToUpper()}";
            }
        }

        /// <summary>
        /// Recopila el reporte completo de telemetría de hardware de la computadora cliente.
        /// </summary>
        public static SystemTelemetryReport CollectFullTelemetry()
        {
            var report = new SystemTelemetryReport
            {
                DeviceUuid = GenerateDeterministicHwid(),
                ComputerName = Environment.MachineName,
                WindowsUser = Environment.UserName,
                OsVersion = GetOsInfo(),
                CpuModel = GetWmiValue("Win32_Processor", "Name") ?? "Intel/AMD Processor",
                RamTotalMb = GetTotalPhysicalMemoryMb(),
                StorageInfo = GetStorageSummary(),
                LocalIpAddress = GetPrimaryIpAddress(),
                MacAddress = GetPrimaryMacAddress(),
                AgentVersion = "1.0.0"
            };

            return report;
        }

        private static string GetWmiValue(string wmiClass, string property)
        {
            try
            {
                using var searcher = new ManagementObjectSearcher($"SELECT {property} FROM {wmiClass}");
                foreach (ManagementObject obj in searcher.Get())
                {
                    var val = obj[property]?.ToString()?.Trim();
                    if (!string.IsNullOrEmpty(val)) return val;
                }
            }
            catch
            {
                // Manejo de entornos sin permisos WMI
            }
            return "UNKNOWN";
        }

        private static string GetOsInfo()
        {
            try
            {
                string caption = GetWmiValue("Win32_OperatingSystem", "Caption");
                string build = GetWmiValue("Win32_OperatingSystem", "BuildNumber");
                string arch = Environment.Is64BitOperatingSystem ? "64-bit" : "32-bit";
                return $"{caption} ({arch}, Build {build})";
            }
            catch
            {
                return Environment.OSVersion.ToString();
            }
        }

        private static int GetTotalPhysicalMemoryMb()
        {
            try
            {
                string totalBytesStr = GetWmiValue("Win32_ComputerSystem", "TotalPhysicalMemory");
                if (long.TryParse(totalBytesStr, out long totalBytes))
                {
                    return (int)(totalBytes / (1024 * 1024));
                }
            }
            catch { }
            return 8192; // Fallback 8GB
        }

        private static string GetStorageSummary()
        {
            try
            {
                var mainDrive = DriveInfo.GetDrives()
                    .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
                    .OrderByDescending(d => d.TotalSize)
                    .FirstOrDefault();

                if (mainDrive != null)
                {
                    long totalGb = mainDrive.TotalSize / (1024 * 1024 * 1024);
                    long freeGb = mainDrive.AvailableFreeSpace / (1024 * 1024 * 1024);
                    return $"{mainDrive.Name} {mainDrive.DriveFormat} ({freeGb} GB Libres de {totalGb} GB)";
                }
            }
            catch { }
            return "Almacenamiento Local (Listo)";
        }

        private static string GetPrimaryMacAddress()
        {
            try
            {
                var nic = NetworkInterface.GetAllNetworkInterfaces()
                    .FirstOrDefault(n => n.OperationalStatus == OperationalStatus.Up && 
                                         n.NetworkInterfaceType != NetworkInterfaceType.Loopback);
                if (nic != null)
                {
                    return string.Join(":", nic.GetPhysicalAddress().GetAddressBytes().Select(b => b.ToString("X2")));
                }
            }
            catch { }
            return "00:1A:2B:3C:4D:5E";
        }

        private static string GetPrimaryIpAddress()
        {
            try
            {
                var nic = NetworkInterface.GetAllNetworkInterfaces()
                    .FirstOrDefault(n => n.OperationalStatus == OperationalStatus.Up && 
                                         n.NetworkInterfaceType != NetworkInterfaceType.Loopback);
                var ip = nic?.GetIPProperties().UnicastAddresses
                    .FirstOrDefault(a => a.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.Address.ToString();
                return ip ?? "127.0.0.1";
            }
            catch
            {
                return "127.0.0.1";
            }
        }
    }
}
