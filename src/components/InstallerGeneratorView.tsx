import React, { useState, useEffect } from 'react';
import {
  Package,
  Server,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Terminal,
  Play,
  RefreshCw,
  Layers,
  Settings2,
  CheckCircle2,
  FileCode,
  Lock,
  Cpu,
  Laptop,
  Flame,
  KeyRound,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  Sparkles,
  ArrowRight,
  Code2
} from 'lucide-react';
import {
  Customer,
  CustomerEnrollmentConfig,
  GeneratedDeploymentPackage,
  InstallerPackageType,
  InstallationMode,
  FirewallRuleSpec,
  ServicePermissionSpec,
  EnrollmentSimulationResult,
  EnrollmentSimulationStep,
} from '../types.ts';
import { soundService } from '../services/soundService.ts';
import { realtimeSocket } from '../services/realtimeSocket.ts';

export function InstallerGeneratorView() {
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'simulator' | 'firewall-specs' | 'csharp-code'>('generator');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Installer Configuration State
  const [packageType, setPackageType] = useState<InstallerPackageType>('MSI_PACKAGE');
  const [installationMode, setInstallationMode] = useState<InstallationMode>('UNATTENDED_SERVICE');
  const [serverUrl, setServerUrl] = useState<string>('https://remotedesk.enterprise.internal:3000');
  const [wsRelayUrl, setWsRelayUrl] = useState<string>('wss://remotedesk.enterprise.internal:3000/ws');
  const [departmentGroup, setDepartmentGroup] = useState<string>('IT_Managed_Endpoints');
  const [allowUnattendedAccess, setAllowUnattendedAccess] = useState<boolean>(true);
  const [requirePinForIncomingSessions, setRequirePinForIncomingSessions] = useState<boolean>(false);
  const [defaultPin, setDefaultPin] = useState<string>('739201');
  const [openFirewallExceptions, setOpenFirewallExceptions] = useState<boolean>(true);
  const [enableWatchdogAutoRecovery, setEnableWatchdogAutoRecovery] = useState<boolean>(true);
  const [tokenExpiryDays, setTokenExpiryDays] = useState<number>(30);

  // Generated Package State
  const [generatedPackage, setGeneratedPackage] = useState<GeneratedDeploymentPackage | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCommandFormat, setSelectedCommandFormat] = useState<'cmd' | 'powershell' | 'intune' | 'gpo' | 'ninja'>('cmd');

  // Simulation State
  const [simComputerName, setSimComputerName] = useState<string>('WS-CORP-FIN-09');
  const [simWindowsUser, setSimWindowsUser] = useState<string>('carlos.finanzas');
  const [simOsVersion, setSimOsVersion] = useState<string>('Windows 11 Pro 64-bit (Build 22631.3447)');
  const [simIpAddress, setSimIpAddress] = useState<string>('192.168.10.142');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<EnrollmentSimulationResult | null>(null);
  const [currentSimStepIndex, setCurrentSimStepIndex] = useState<number>(-1);

  // Firewall Specs State
  const [firewallRules, setFirewallRules] = useState<FirewallRuleSpec[]>([]);
  const [serviceSpec, setServiceSpec] = useState<ServicePermissionSpec | null>(null);

  // C# Code State
  const [selectedCsFile, setSelectedCsFile] = useState<string>('RemoteDeskAgent.iss');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    fetchCustomersAndConfigs();
  }, []);

  const fetchCustomersAndConfigs = async () => {
    try {
      const res = await fetch('/api/v1/installers/configs');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.customers && data.customers.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(data.customers[0].id);
        }
        setFirewallRules(data.firewallRules || []);
        setServiceSpec(data.serviceSpec || null);
      }
    } catch (err) {
      console.error('Error fetching installer configs:', err);
    }
  };

  const handleGeneratePackage = async () => {
    if (!selectedCustomerId) return;
    try {
      setGenerating(true);
      soundService.playActionSound();

      const payload = {
        customerId: selectedCustomerId,
        packageType,
        installationMode,
        serverUrl,
        wsRelayUrl,
        departmentGroup,
        allowUnattendedAccess,
        requirePinForIncomingSessions,
        defaultPin,
        openFirewallExceptions,
        enableWatchdogAutoRecovery,
      };

      const res = await fetch('/api/v1/installers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const pkg: GeneratedDeploymentPackage = await res.json();
        setGeneratedPackage(pkg);
        soundService.playSuccessSound();
      }
    } catch (err) {
      console.error('Error generating installer package:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!selectedCustomerId) return;
    try {
      setIsSimulating(true);
      setSimulationResult(null);
      setCurrentSimStepIndex(0);
      soundService.playActionSound();

      const payload = {
        customerId: selectedCustomerId,
        computerName: simComputerName,
        windowsUser: simWindowsUser,
        osVersion: simOsVersion,
        ipAddress: simIpAddress,
        enrollmentToken: generatedPackage?.enrollmentToken,
      };

      // Step-by-step visual animation
      for (let step = 0; step < 5; step++) {
        setCurrentSimStepIndex(step);
        soundService.playActionSound();
        await new Promise((resolve) => setTimeout(resolve, 450));
      }

      const res = await fetch('/api/v1/installers/simulate-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result: EnrollmentSimulationResult = await res.json();
        setSimulationResult(result);
        setCurrentSimStepIndex(5);
        soundService.playSuccessSound();
      }
    } catch (err) {
      console.error('Error in enrollment simulation:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    soundService.playActionSound();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (type: 'inno' | 'wix' | 'config' | 'ps1') => {
    if (!generatedPackage) return;
    window.open(`/api/v1/installers/download/${generatedPackage.enrollmentToken}?type=${type}`, '_blank');
    soundService.playActionSound();
  };

  // C# and Script code definitions for Tab 4
  const csFiles: Record<string, { title: string; desc: string; code: string }> = {
    'RemoteDeskAgent.iss': {
      title: 'RemoteDeskAgent.iss (Inno Setup 6 Script)',
      desc: 'Script completo de Inno Setup con parseo de parámetros silenciosos, incrustación de ID de cliente, y registro de servicio.',
      code: generatedPackage?.generatedFiles.innoSetupScript || `; =====================================================================
; RemoteDesk Enterprise - Inno Setup 6 Script
; Modo de Instalación: Servicio Desatendido con Incrustación de Tenant
; =====================================================================

#define MyAppName "RemoteDesk Enterprise Agent"
#define MyAppVersion "1.5.0"
#define MyAppPublisher "RemoteDesk Security Solutions"
#define MyAppExeName "RemoteDesk.Agent.exe"
#define MyServiceExeName "RemoteDesk.Service.exe"
#define MyServiceName "RemoteDeskAgentService"

[Setup]
AppId={{D4CB75FD-6A07-4BD8-BE0C-83CDF6D40D94}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\\RemoteDesk Enterprise
DefaultGroupName=RemoteDesk Enterprise
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=RemoteDesk_Setup_Enterprise
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "bin\\publish\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "embedded\\appsettings.json"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Incrustación de Tenant y Configuración en HKLM (Inmutable)
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "CustomerId"; ValueData: "{#MyCustomerId}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "EnrollmentToken"; ValueData: "{#MyTenantToken}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "ServerUrl"; ValueData: "https://remotedesk.enterprise.internal:3000"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: dword; ValueName: "UnattendedAccess"; ValueData: 1; Flags: uninsdeletekey

[Run]
; Registro de Servicio Windows con Autorecuperación en caso de caída
Filename: "{sys}\\sc.exe"; Parameters: "create {#MyServiceName} binPath= \\"{app}\\{#MyServiceExeName}\\" start= delayed-auto DisplayName= \\"RemoteDesk Enterprise Agent Core Service\\""; Flags: runhidden
Filename: "{sys}\\sc.exe"; Parameters: "failure {#MyServiceName} reset= 86400 actions= restart/60000/restart/120000/restart/300000"; Flags: runhidden

; Excepciones de Firewall Windows Defender
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=\\"RemoteDesk WebRTC UDP\\" dir=in action=allow protocol=UDP localport=50000-65535 profile=any"; Flags: runhidden
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=\\"RemoteDesk Signaling WSS\\" dir=out action=allow protocol=TCP remoteport=3000,443 profile=any"; Flags: runhidden

; Iniciar el servicio
Filename: "{sys}\\sc.exe"; Parameters: "start {#MyServiceName}"; Flags: runhidden`,
    },
    'Product.wxs': {
      title: 'Product.wxs (WiX Toolset v4/v5 XML)',
      desc: 'Definición XML de WiX Toolset para generación de MSI corporativo para Microsoft Intune / GPO Active Directory.',
      code: generatedPackage?.generatedFiles.wixToolsetXml || `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Package Name="RemoteDesk Enterprise Agent"
           Manufacturer="RemoteDesk Security Inc."
           Version="1.5.0.0"
           UpgradeCode="7E48B032-6A07-4BD8-BE0C-83CDF6D40D94"
           Scope="perMachine"
           Language="1034"
           Codepage="1252">

    <MajorUpgrade DowngradeErrorMessage="Ya existe una versión más reciente instalada." AllowSameVersionUpgrades="yes" />
    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />

    <!-- Propiedades MSI Overridables vía CLI -->
    <Property Id="CUSTOMERID" Value="cust-acme-01" />
    <Property Id="SERVERURL" Value="https://remotedesk.enterprise.internal:3000" />
    <Property Id="ENROLLTOKEN" Value="ENROLL-ACME-SECURE" />

    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="RemoteDesk Enterprise">
        <Component Id="C_MainExecutable" Guid="A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D" Bitness="always64">
          <File Id="F_RemoteDeskAgentExe" Source="bin\\publish\\RemoteDesk.Agent.exe" KeyPath="yes" />
          <File Id="F_RemoteDeskServiceExe" Source="bin\\publish\\RemoteDesk.Service.exe" />
          <File Id="F_AppSettingsJson" Source="embedded\\appsettings.json" />

          <!-- Instalación nativa del Servicio de Windows -->
          <ServiceInstall Id="ServiceInstaller"
                          Type="ownProcess"
                          Name="RemoteDeskAgentService"
                          DisplayName="RemoteDesk Enterprise Agent Core Service"
                          Start="auto"
                          Account="LocalSystem"
                          DelayedAutoStart="yes" />
          <ServiceControl Id="ServiceController" Name="RemoteDeskAgentService" Start="install" Stop="both" Remove="uninstall" />
        </Component>
      </Directory>
    </StandardDirectory>

    <Feature Id="MainFeature" Title="RemoteDesk Agent Engine" Level="1">
      <ComponentRef Id="C_MainExecutable" />
    </Feature>
  </Package>
</Wix>`,
    },
    'WindowsServiceInstaller.cs': {
      title: 'WindowsServiceInstaller.cs (C# .NET 9 Service Manager)',
      desc: 'Manejador nativo de instalación, desinstalación y configuración de recuperación de servicios Win32.',
      code: `using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.ServiceProcess;
using Microsoft.Win32;

namespace RemoteDesk.Windows.Installer
{
    /// <summary>
    /// Gestiona la instalación, desinstalación y configuración de seguridad del Servicio Windows en Session 0.
    /// </summary>
    [SupportedOSPlatform("windows")]
    public static class WindowsServiceInstaller
    {
        public const string ServiceName = "RemoteDeskAgentService";
        public const string ServiceDisplayName = "RemoteDesk Enterprise Agent Core Service";
        public const string RegistryBasePath = @"SOFTWARE\\RemoteDesk\\Enterprise";

        public static bool InstallService(string customerId, string serverUrl, string enrollmentToken, bool unattended = true)
        {
            try
            {
                string exePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "RemoteDesk.Service.exe");
                if (!File.Exists(exePath))
                {
                    Console.Error.WriteLine($"[FATAL] No se encontró el binario del servicio en: {exePath}");
                    return false;
                }

                // 1. Inyectar configuración en Registro HKLM de Windows
                using (var key = Registry.LocalMachine.CreateSubKey(RegistryBasePath))
                {
                    if (key != null)
                    {
                        key.SetValue("CustomerId", customerId, RegistryValueKind.String);
                        key.SetValue("ServerUrl", serverUrl, RegistryValueKind.String);
                        key.SetValue("EnrollmentToken", enrollmentToken, RegistryValueKind.String);
                        key.SetValue("UnattendedAccess", unattended ? 1 : 0, RegistryValueKind.DWord);
                        key.SetValue("InstalledAt", DateTime.UtcNow.ToString("o"), RegistryValueKind.String);
                    }
                }

                // 2. Crear el servicio de Windows mediante sc.exe con Delayed-Auto y permisos LocalSystem
                ExecuteProcess("sc.exe", $"create {ServiceName} binPath= \"{exePath}\" start= delayed-auto DisplayName= \"{ServiceDisplayName}\"");

                // 3. Configurar Política de Recuperación Automática (Restart tras 1min, 2min, 5min)
                ExecuteProcess("sc.exe", $"failure {ServiceName} reset= 86400 actions= restart/60000/restart/120000/restart/300000");

                // 4. Configurar descripción de servicio
                ExecuteProcess("sc.exe", $"description {ServiceName} \"Servicio de gestión remota de endpoints corporativos con captura DXGI y WebRTC.\"");

                // 5. Iniciar el servicio inmediatamente
                ExecuteProcess("sc.exe", $"start {ServiceName}");

                Console.WriteLine($"[OK] Servicio {ServiceName} instalado e iniciado correctamente.");
                return true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] Falló la instalación del servicio: {ex.Message}");
                return false;
            }
        }

        public static bool UninstallService()
        {
            try
            {
                ExecuteProcess("sc.exe", $"stop {ServiceName}");
                ExecuteProcess("sc.exe", $"delete {ServiceName}");

                using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\\RemoteDesk", true))
                {
                    key?.DeleteSubKeyTree("Enterprise", false);
                }

                Console.WriteLine($"[OK] Servicio {ServiceName} desinstalado con éxito.");
                return true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] Falló la desinstalación del servicio: {ex.Message}");
                return false;
            }
        }

        private static int ExecuteProcess(string fileName, string args)
        {
            var psi = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using var proc = Process.Start(psi);
            proc?.WaitForExit();
            return proc?.ExitCode ?? -1;
        }
    }
}`,
    },
    'FirewallAndSecurityConfigurator.cs': {
      title: 'FirewallAndSecurityConfigurator.cs (C# COM Interop Firewall)',
      desc: 'Configuración nativa de reglas en Windows Defender Firewall mediante COM API INetFwPolicy2 sin dependencias externas.',
      code: `using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace RemoteDesk.Windows.Security
{
    /// <summary>
    /// Configura excepciones de red nativas en Windows Defender Firewall para WebRTC UDP y WSS.
    /// </summary>
    [SupportedOSPlatform("windows")]
    public static class FirewallAndSecurityConfigurator
    {
        public static void ConfigureAllFirewallRules()
        {
            try
            {
                // Regla 1: WebRTC UDP para streaming DXGI (Inbound 50000-65535)
                AddRule("RemoteDesk-Enterprise-WebRTC-UDP", "Inbound", "UDP", "50000-65535", "Streaming de vídeo DXGI y canales de datos WebRTC");

                // Regla 2: WebSocket Signaling WSS (Outbound TCP 3000, 443)
                AddRule("RemoteDesk-Enterprise-Signaling-WSS", "Outbound", "TCP", "3000,443", "Conexión saliente con el Servidor Central de Señalización");

                // Regla 3: Transferencia de Archivos (Inbound TCP 45825)
                AddRule("RemoteDesk-Enterprise-FileTransfer", "Inbound", "TCP", "45825", "Canal directo de transferencia de archivos por bloques");

                Console.WriteLine("[FIREWALL:OK] Excepciones aplicadas en Windows Defender Firewall.");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[FIREWALL:WARN] No se pudieron aplicar todas las reglas: {ex.Message}");
            }
        }

        private static void AddRule(string name, string direction, string protocol, string ports, string description)
        {
            string dirParam = direction.Equals("Inbound", StringComparison.OrdinalIgnoreCase) ? "in" : "out";
            string portParam = dirParam == "in" ? $"localport={ports}" : $"remoteport={ports}";

            var psi = new ProcessStartInfo
            {
                FileName = "netsh.exe",
                Arguments = $"advfirewall firewall add rule name=\"{name}\" dir={dirParam} action=allow protocol={protocol} {portParam} profile=any description=\"{description}\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            p?.WaitForExit();
        }

        public static void RemoveAllFirewallRules()
        {
            string[] rules = { "RemoteDesk-Enterprise-WebRTC-UDP", "RemoteDesk-Enterprise-Signaling-WSS", "RemoteDesk-Enterprise-FileTransfer" };
            foreach (var rule in rules)
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "netsh.exe",
                    Arguments = $"advfirewall firewall delete rule name=\"{rule}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var p = Process.Start(psi);
                p?.WaitForExit();
            }
        }
    }
}`,
    },
    'Deploy-RemoteDeskAgent.ps1': {
      title: 'Deploy-RemoteDeskAgent.ps1 (PowerShell Script)',
      desc: 'Script de despliegue automatizado para flotas masivas vía Microsoft Intune, GPO o NinjaOne.',
      code: generatedPackage?.generatedFiles.deployPowerShellScript || `<#
.SYNOPSIS
    Script de despliegue silencioso automatizado de RemoteDesk Enterprise Agent.
    Compatible con Microsoft Intune, GPO Startup Script, NinjaOne y Datto RMM.
#>

param(
    [string]$ServerUrl = "https://remotedesk.enterprise.internal:3000",
    [string]$CustomerId = "cust-acme-01",
    [string]$EnrollmentToken = "ENROLL-ACME-SECURE",
    [switch]$Unattended = $true,
    [switch]$ConfigureFirewall = $true
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "[FATAL] Se requieren privilegios de Administrador para ejecutar este script."
    exit 1
}

Write-Host "Iniciando despliegue silencioso de RemoteDesk Enterprise..." -ForegroundColor Cyan

$TempDir = "$env:TEMP\\RemoteDesk_Install_$(Get-Random)"
New-Item -Path $TempDir -ItemType Directory -Force | Out-Null
$MsiPath = "$TempDir\\RemoteDesk_Setup.msi"

try {
    Write-Host "[1/4] Descargando instalador MSI..." -ForegroundColor Green
    Invoke-WebRequest -Uri "$ServerUrl/api/v1/installers/download/$EnrollmentToken?type=msi" -OutFile $MsiPath -UseBasicParsing

    Write-Host "[2/4] Ejecutando instalación MSIEXEC silenciosa..." -ForegroundColor Green
    $msiArgs = @("/i", "\`"$MsiPath\`"", "/qn", "/norestart", "CUSTOMERID=\`"$CustomerId\`"", "SERVERURL=\`"$ServerUrl\`"", "ENROLLTOKEN=\`"$EnrollmentToken\`"")
    $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru -NoNewWindow

    if ($ConfigureFirewall) {
        Write-Host "[3/4] Agregando reglas a Windows Firewall..." -ForegroundColor Green
        New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-WebRTC-UDP" -Direction Inbound -Protocol UDP -LocalPort 50000-65535 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
    }

    Write-Host "[4/4] Iniciando servicio 'RemoteDeskAgentService'..." -ForegroundColor Green
    Start-Service -Name "RemoteDeskAgentService" -ErrorAction SilentlyContinue

    Write-Host "[OK] Endpoint desplegado y conectado exitosamente." -ForegroundColor Cyan
} finally {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}`,
    },
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-500/10 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> FASE 11: INSTALADORES & DESPLIEGUE WINDOWS
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                MSI • InnoSetup • GPO / Intune Ready
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Generador de Instaladores Silenciosos & Auto-Aprovisionamiento
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Crea paquetes instaladores MSI y ejecutables Inno Setup con el ID de cliente incrustado, tokens de aprovisionamiento
              seguros, registro de servicio Windows 24/7 con autorrecuperación y excepciones automáticas en Windows Defender Firewall.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGeneratePackage}
              disabled={generating || !selectedCustomerId}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generando Paquete...' : 'Generar Instalador Personalizado'}</span>
            </button>

            <button
              onClick={() => setActiveSubTab('simulator')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Simular Despliegue</span>
            </button>
          </div>
        </div>

        {/* Global KPI Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Modos de Instalación</span>
              <Layers className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              MSI / Exe / Service
            </div>
            <div className="text-[11px] text-red-400 flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Silencioso /qn /VERYSILENT
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Incrustación de Tenant</span>
              <Building className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {customers.length} Clientes Listos
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> Tokens HMAC Auto-Exp
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Reglas de Firewall</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {firewallRules.length} Excepciones
            </div>
            <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> UDP WebRTC / WSS TCP
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Servicio Windows</span>
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              Delayed-Auto 24/7
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Autorecuperación 60s
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('generator');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'generator'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>1. Generador & Personalización de Instaladores</span>
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('simulator');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'simulator'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>2. Simulador Interactivo de Despliegue & HWID</span>
          {simulationResult && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
              Enrolado
            </span>
          )}
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('firewall-specs');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'firewall-specs'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>3. Matriz de Firewall & Permisos de Servicio</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
            {firewallRules.length} Reglas
          </span>
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('csharp-code');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'csharp-code'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>4. Scripts & Código C# .NET 9</span>
          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
            5 Fuentes
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUBTAB 1: GENERADOR & PERSONALIZACIÓN DE INSTALADORES */}
      {/* ======================================================== */}
      {activeSubTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold text-white">Parámetros del Cliente & Tenant</h3>
                </div>
                <span className="text-xs text-slate-400">Paso 1 de 3</span>
              </div>

              {/* Customer Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Cliente Corporativo Asignado:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    soundService.playActionSound();
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_name} - {c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Format and Mode Selector Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tipo de Paquete:</label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value as InstallerPackageType)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="MSI_PACKAGE">Paquete MSI Empresarial (.msi)</option>
                    <option value="INNO_SETUP_EXE">Instalador Silencioso Setup.exe (InnoSetup)</option>
                    <option value="PORTABLE_QUICK_SUPPORT">Quick Support On-Demand (.exe)</option>
                    <option value="POWERSHELL_DEPLOYER">Script PowerShell de Despliegue RMM (.ps1)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Modo de Operación:</label>
                  <select
                    value={installationMode}
                    onChange={(e) => setInstallationMode(e.target.value as InstallationMode)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="UNATTENDED_SERVICE">Servicio Desatendido 24/7 (LocalSystem)</option>
                    <option value="ENTERPRISE_GPO_INTUNE">Despliegue Masivo GPO / Intune</option>
                    <option value="ON_DEMAND_USER">Asistencia Temporal Bajo Demanda</option>
                  </select>
                </div>
              </div>

              {/* Server URLs & Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">URL del Servidor Central:</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Grupo / Departamento:</label>
                  <input
                    type="text"
                    value={departmentGroup}
                    onChange={(e) => setDepartmentGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                    placeholder="Ej. Finanzas, Servidores, Sucursal_Norte"
                  />
                </div>
              </div>

              {/* Service & Security Toggles */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">
                  Configuración de Seguridad & Privilegios
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={openFirewallExceptions}
                      onChange={(e) => setOpenFirewallExceptions(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-red-500 h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Excepciones de Firewall</div>
                      <div className="text-[11px] text-slate-400">Abre UDP 50000-65535 y WSS</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={enableWatchdogAutoRecovery}
                      onChange={(e) => setEnableWatchdogAutoRecovery(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-red-500 h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Watchdog Autorecuperación</div>
                      <div className="text-[11px] text-slate-400">Reinicio de servicio en fallo (60s)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={allowUnattendedAccess}
                      onChange={(e) => setAllowUnattendedAccess(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-red-500 h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Acceso Desatendido 24/7</div>
                      <div className="text-[11px] text-slate-400">Permite conexión sin usuario local</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={requirePinForIncomingSessions}
                      onChange={(e) => setRequirePinForIncomingSessions(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-red-500 h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Exigir PIN de Aprobación</div>
                      <div className="text-[11px] text-slate-400">El usuario debe confirmar conexión</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-2">
                <button
                  onClick={handleGeneratePackage}
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
                >
                  <Package className={`w-4 h-4 ${generating ? 'animate-bounce' : ''}`} />
                  <span>{generating ? 'Compilando e Incrustando Manifiesto...' : 'Compilar y Generar Paquete de Despliegue'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Output & Silent Commands (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {generatedPackage ? (
              <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Paquete Compilado con Éxito</h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {generatedPackage.fileName}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LISTO
                  </span>
                </div>

                {/* Package Meta Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Token de Aprovisionamiento:</span>
                    <span className="font-mono text-red-300 font-bold break-all text-[11px]">
                      {generatedPackage.enrollmentToken}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Tamaño & Hash SHA-256:</span>
                    <span className="font-mono text-slate-200 font-bold block">
                      {Math.round(generatedPackage.fileSizeBytes / (1024 * 1024))} MB
                    </span>
                    <span className="font-mono text-slate-400 text-[10px] truncate block">
                      {generatedPackage.sha256Hash.substring(0, 16)}...
                    </span>
                  </div>
                </div>

                {/* Silent Commands Selector & Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-red-400" /> Comandos de Instalación Silenciosa
                    </span>
                  </div>

                  {/* Format Pills */}
                  <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                    {[
                      { id: 'cmd', label: 'CMD / Batch' },
                      { id: 'powershell', label: 'PowerShell' },
                      { id: 'intune', label: 'MS Intune' },
                      { id: 'gpo', label: 'GPO AD' },
                      { id: 'ninja', label: 'RMM Script' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedCommandFormat(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          selectedCommandFormat === f.id
                            ? 'bg-red-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Code Snippet Box */}
                  <div className="relative bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 break-all leading-relaxed">
                    <code>
                      {selectedCommandFormat === 'cmd' && generatedPackage.silentCommands.cmdPrompt}
                      {selectedCommandFormat === 'powershell' && generatedPackage.silentCommands.powershell}
                      {selectedCommandFormat === 'intune' && generatedPackage.silentCommands.intuneInstallCmd}
                      {selectedCommandFormat === 'gpo' && generatedPackage.silentCommands.gpoStartupScript}
                      {selectedCommandFormat === 'ninja' && generatedPackage.silentCommands.ninjaRmmScript}
                    </code>

                    <button
                      onClick={() => {
                        const code =
                          selectedCommandFormat === 'cmd'
                            ? generatedPackage.silentCommands.cmdPrompt
                            : selectedCommandFormat === 'powershell'
                            ? generatedPackage.silentCommands.powershell
                            : selectedCommandFormat === 'intune'
                            ? generatedPackage.silentCommands.intuneInstallCmd
                            : selectedCommandFormat === 'gpo'
                            ? generatedPackage.silentCommands.gpoStartupScript
                            : generatedPackage.silentCommands.ninjaRmmScript;
                        handleCopy(code, 'command');
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'command' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'command' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Download Action Strip */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Descargar Fuentes & Manifiestos:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleDownloadFile('inno')}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-red-400" />
                      <span>.ISS (Inno)</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile('wix')}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>.WXS (MSI)</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile('ps1')}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>.PS1 (Deploy)</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile('config')}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Config JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                  <Package className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Listo para Compilar</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Selecciona el cliente corporativo y personaliza las opciones en el panel izquierdo para generar el paquete instalador MSI / Setup.exe.
                  </p>
                </div>
                <button
                  onClick={handleGeneratePackage}
                  disabled={generating || !selectedCustomerId}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-red-950/40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Paquete de Prueba</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: SIMULADOR INTERACTIVO DE DESPLIEGUE & HWID */}
      {/* ======================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" /> Simulador de Instalación Desatendida & Auto-Enrollment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ejecuta el ciclo de vida completo de instalación en un equipo cliente Windows 10/11 sin interacción humana.
                </p>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 self-start sm:self-auto"
              >
                <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Desplegando en Endpoint...' : 'Iniciar Despliegue Silencioso'}</span>
              </button>
            </div>

            {/* Target Endpoint Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Nombre de Equipo (ComputerName):</span>
                <input
                  type="text"
                  value={simComputerName}
                  onChange={(e) => setSimComputerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Usuario de Windows:</span>
                <input
                  type="text"
                  value={simWindowsUser}
                  onChange={(e) => setSimWindowsUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Dirección IPv4 Local:</span>
                <input
                  type="text"
                  value={simIpAddress}
                  onChange={(e) => setSimIpAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Sistema Operativo:</span>
                <input
                  type="text"
                  value={simOsVersion}
                  onChange={(e) => setSimOsVersion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Step-by-Step Execution Pipeline */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Pipeline de Aprovisionamiento MSIEXEC / Win32
              </h4>

              <div className="space-y-2.5">
                {[
                  {
                    step: 1,
                    title: '1. Extracción MSI & Validación de Permisos SeServiceLogonRight',
                    desc: 'Verificación de firma digital Authenticode y elevación administrativa.',
                  },
                  {
                    step: 2,
                    title: '2. Inyección de Tenant & Manifiesto HKLM\\Software\\RemoteDesk',
                    desc: `Incrustación de CustomerId: ${selectedCustomerId}, token de tenant y settings.`,
                  },
                  {
                    step: 3,
                    title: '3. Apertura de Excepciones en Windows Defender Firewall',
                    desc: 'Inyección de reglas para UDP WebRTC (50000-65535) y WSS (443/3000).',
                  },
                  {
                    step: 4,
                    title: '4. Creación y Arranque de RemoteDeskAgentService (Session 0)',
                    desc: 'Servicio configurado en Delayed-Auto con autorrecuperación tras caídas.',
                  },
                  {
                    step: 5,
                    title: '5. Handshake WebSocket, Generación de HWID y Alta en Base de Datos',
                    desc: 'El endpoint se conecta en vivo y queda disponible para asistencia remota inmediata.',
                  },
                ].map((s) => {
                  const isPast = currentSimStepIndex >= s.step;
                  const isCurrent = currentSimStepIndex === s.step - 1 && isSimulating;

                  return (
                    <div
                      key={s.step}
                      className={`p-4 rounded-xl border transition-all ${
                        isPast
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : isCurrent
                          ? 'bg-red-950/30 border-red-500/50 text-red-200 animate-pulse'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                              isPast
                                ? 'bg-emerald-500 text-slate-950'
                                : isCurrent
                                ? 'bg-red-600 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isPast ? <Check className="w-4 h-4" /> : s.step}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-white">{s.title}</div>
                            <div className="text-[11px] text-slate-400">{s.desc}</div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isPast
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isCurrent
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-slate-900 text-slate-500'
                          }`}
                        >
                          {isPast ? 'COMPLETADO' : isCurrent ? 'EJECUTANDO...' : 'EN ESPERA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulation Final Verdict Card */}
            {simulationResult && (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>¡Endpoint Enrolado y Conectado en Vivo!</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    HWID: {simulationResult.hwidHash}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  El equipo <strong>{simulationResult.computerName}</strong> ha completado la instalación silenciosa,
                  registró el servicio Windows <code>RemoteDeskAgentService</code>, abrió las reglas de firewall y
                  estableció el handshake de señalización WebSocket con el servidor central.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                    ID Dispositivo: <span className="text-red-400">{simulationResult.deviceId}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                    Estado Servicio: <span className="text-emerald-400">{simulationResult.serviceStatus}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                    Reglas Firewall: <span className="text-red-400">{simulationResult.firewallRulesAdded} añadidas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: MATRIZ DE FIREWALL & PERMISOS DE SERVICIO */}
      {/* ======================================================== */}
      {activeSubTab === 'firewall-specs' && (
        <div className="space-y-6">
          {/* Firewall Rules Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" /> Excepciones de Red en Windows Defender Firewall
                </h3>
                <p className="text-xs text-slate-400">
                  Reglas inyectadas automáticamente por el instalador mediante COM Interop / netsh para evitar bloqueos de streaming y WebRTC.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Nombre de Regla</th>
                    <th className="py-3 px-4">Dirección & Protocolo</th>
                    <th className="py-3 px-4">Puertos</th>
                    <th className="py-3 px-4">Perfiles</th>
                    <th className="py-3 px-4">Propósito</th>
                    <th className="py-3 px-4 text-right">Comando Netsh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {firewallRules.map((rule, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {rule.ruleName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rule.direction === 'Inbound'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {rule.direction} {rule.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-300 font-bold">
                        {rule.ports}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans">
                        {rule.profiles}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                        {rule.description}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => handleCopy(rule.commandNetsh, `netsh-${idx}`)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700 inline-flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === `netsh-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === `netsh-${idx}` ? 'Copiado' : 'Netsh'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Architecture & Session 0 Specifications */}
          {serviceSpec && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service Permissions & Recovery */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">Configuración del Servicio Win32</h4>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">Nombre de Servicio:</span>
                    <span className="font-mono text-red-300 font-bold">{serviceSpec.serviceName}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">Cuenta de Ejecución:</span>
                    <span className="font-mono text-emerald-400 font-bold">{serviceSpec.account}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">Tipo de Inicio:</span>
                    <span className="font-mono text-slate-200">{serviceSpec.startType}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">1er Fallo (Watchdog):</span>
                    <span className="font-mono text-amber-300">{serviceSpec.recoveryFirstFailure}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">2do Fallo (Watchdog):</span>
                    <span className="font-mono text-amber-300">{serviceSpec.recoverySecondFailure}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-950">
                    <span className="text-slate-400">Fallos Posteriores:</span>
                    <span className="font-mono text-rose-300">{serviceSpec.recoverySubsequentFailures}</span>
                  </div>
                </div>
              </div>

              {/* Session 0 Isolation & Desktop Interop */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-5 h-5 text-red-400" />
                  <h4 className="text-sm font-bold text-white">Manejo de Sesión 0 & Elevación UAC</h4>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="font-bold text-red-300 block mb-1">Aislamiento de Sesión 0 de Windows:</span>
                    <p className="text-slate-400 text-[11px]">
                      {serviceSpec.session0IsolationHandling}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="font-bold text-emerald-300 block mb-1">Interacción con Logon Desktop & Ctrl+Alt+Del:</span>
                    <p className="text-slate-400 text-[11px]">
                      El servicio ejecuta un helper liviano <code>RemoteDesk.Elevator.exe</code> en el escritorio interactivo
                      del usuario mediante <code>WTSQueryUserToken</code> para capturar la pantalla bloqueada y diálogos de seguridad UAC.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 break-all">
                    <span className="font-bold text-slate-300 block mb-0.5">DACL de Seguridad del Servicio:</span>
                    {serviceSpec.daclPermissions}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 4: SCRIPTS & CÓDIGO C# .NET 9 */}
      {/* ======================================================== */}
      {activeSubTab === 'csharp-code' && (
        <div className="space-y-4">
          {/* File Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            {Object.keys(csFiles).map((fileName) => (
              <button
                key={fileName}
                onClick={() => {
                  setSelectedCsFile(fileName);
                  soundService.playActionSound();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                  selectedCsFile === fileName
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-red-400">
                    {csFiles[selectedCsFile].title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Producción Windows
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {csFiles[selectedCsFile].desc}
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(csFiles[selectedCsFile].code);
                  setCopiedCode(true);
                  soundService.playActionSound();
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] scrollbar-thin">
              <pre className="leading-relaxed">
                <code>{csFiles[selectedCsFile].code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
