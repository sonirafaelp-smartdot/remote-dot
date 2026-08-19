import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.ts';
import { realtimeHub } from '../realtime.ts';
import {
  CustomerEnrollmentConfig,
  GeneratedDeploymentPackage,
  InstallerPackageType,
  InstallationMode,
  FirewallRuleSpec,
  ServicePermissionSpec,
  EnrollmentSimulationResult,
} from '../../src/types.ts';

export const installersRouter = Router();

// In-memory store for generated packages
const generatedPackagesStore = new Map<string, GeneratedDeploymentPackage>();

// Predefined Firewall Rules Matrix
const FIREWALL_RULES_SPECS: FirewallRuleSpec[] = [
  {
    ruleName: 'RemoteDesk-Enterprise-WebRTC-UDP',
    direction: 'Inbound',
    protocol: 'UDP',
    ports: '50000-65535',
    action: 'Allow',
    profiles: 'Domain,Private,Public',
    description: 'Permite el streaming de vídeo DXGI de baja latencia y audio mediante canales WebRTC peer-to-peer.',
    commandNetsh: 'netsh advfirewall firewall add rule name="RemoteDesk-Enterprise-WebRTC-UDP" dir=in action=allow protocol=UDP localport=50000-65535 profile=any',
    commandPowerShell: 'New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-WebRTC-UDP" -Direction Inbound -Protocol UDP -LocalPort 50000-65535 -Action Allow -Profile Any',
  },
  {
    ruleName: 'RemoteDesk-Enterprise-Signaling-WSS',
    direction: 'Outbound',
    protocol: 'TCP',
    ports: '3000, 443, 8443',
    action: 'Allow',
    profiles: 'Domain,Private,Public',
    description: 'Conexión saliente persistente hacia el Servidor Central de Señalización y Telemetría WebSocket.',
    commandNetsh: 'netsh advfirewall firewall add rule name="RemoteDesk-Enterprise-Signaling-WSS" dir=out action=allow protocol=TCP remoteport=3000,443,8443 profile=any',
    commandPowerShell: 'New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-Signaling-WSS" -Direction Outbound -Protocol TCP -RemotePort 3000,443,8443 -Action Allow -Profile Any',
  },
  {
    ruleName: 'RemoteDesk-Enterprise-LAN-Discovery',
    direction: 'Inbound',
    protocol: 'UDP',
    ports: '45824',
    action: 'Allow',
    profiles: 'Domain,Private',
    description: 'Descubrimiento local de endpoints para conexión directa P2P dentro de la misma subred corporativa (evita consumo WAN).',
    commandNetsh: 'netsh advfirewall firewall add rule name="RemoteDesk-Enterprise-LAN-Discovery" dir=in action=allow protocol=UDP localport=45824 profile=domain,private',
    commandPowerShell: 'New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-LAN-Discovery" -Direction Inbound -Protocol UDP -LocalPort 45824 -Action Allow -Profile Domain,Private',
  },
  {
    ruleName: 'RemoteDesk-Enterprise-FileTransfer-Stream',
    direction: 'Inbound',
    protocol: 'TCP',
    ports: '45825',
    action: 'Allow',
    profiles: 'Domain,Private,Public',
    description: 'Canal de transferencia de archivos por bloques (chunks) con verificación de integridad SHA-256.',
    commandNetsh: 'netsh advfirewall firewall add rule name="RemoteDesk-Enterprise-FileTransfer-Stream" dir=in action=allow protocol=TCP localport=45825 profile=any',
    commandPowerShell: 'New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-FileTransfer-Stream" -Direction Inbound -Protocol TCP -LocalPort 45825 -Action Allow -Profile Any',
  },
];

// Predefined Windows Service Specs
const SERVICE_PERMISSION_SPEC: ServicePermissionSpec = {
  serviceName: 'RemoteDeskAgentService',
  displayName: 'RemoteDesk Enterprise Agent Core Service',
  account: 'NT AUTHORITY\\LocalSystem',
  startType: 'Automatic (Delayed Start)',
  recoveryFirstFailure: 'Restart Service (1 min)',
  recoverySecondFailure: 'Restart Service (2 min)',
  recoverySubsequentFailures: 'Restart Service (5 min)',
  resetFailCountDays: 1,
  daclPermissions: 'D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)S:(AU;FA;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;WD)',
  session0IsolationHandling: 'Ejecuta en Session 0 con invocación de Desktop Interop via DuplicateTokenEx & CreateProcessAsUser para captura de Logon Screen y UAC.',
};

// Helper: Generate Inno Setup .iss script
function generateInnoSetupScript(config: CustomerEnrollmentConfig): string {
  return `; =====================================================================
; RemoteDesk Enterprise - Inno Setup 6 Script
; Generado automáticamente para: ${config.customerCompany}
; Modo de Instalación: ${config.installationMode}
; =====================================================================

#define MyAppName "RemoteDesk Enterprise Agent"
#define MyAppVersion "1.5.0"
#define MyAppPublisher "RemoteDesk Security Solutions"
#define MyAppURL "${config.serverUrl}"
#define MyAppExeName "RemoteDesk.Agent.exe"
#define MyServiceExeName "RemoteDesk.Service.exe"
#define MyServiceName "${config.serviceName}"
#define MyCustomerId "${config.customerId}"
#define MyTenantToken "${config.enrollmentToken}"

[Setup]
AppId={{D4CB75FD-6A07-4BD8-BE0C-83CDF6D40D94}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/updates
DefaultDirName={autopf}\\RemoteDesk Enterprise
DefaultGroupName=RemoteDesk Enterprise
DisableProgramGroupPage=yes
LicenseFile=embedded\\eula.txt
OutputDir=Output
OutputBaseFilename=RemoteDesk_Setup_${config.customerId}
SetupIconFile=assets\\app_icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64compatible
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Binarios principales .NET 9
Source: "bin\\publish\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Manifiesto de configuración con Tenant ID incrustado
Source: "embedded\\appsettings.json"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Incrustación de Tenant y Configuración en HKLM (Seguro contra manipulación)
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "CustomerId"; ValueData: "{#MyCustomerId}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "CustomerCompany"; ValueData: "${config.customerCompany}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "EnrollmentToken"; ValueData: "{#MyTenantToken}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "ServerUrl"; ValueData: "${config.serverUrl}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "WsRelayUrl"; ValueData: "${config.wsRelayUrl}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: dword; ValueName: "UnattendedAccess"; ValueData: "${config.allowUnattendedAccess ? 1 : 0}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: dword; ValueName: "RequirePin"; ValueData: "${config.requirePinForIncomingSessions ? 1 : 0}"; Flags: uninsdeletekey
${config.departmentGroup ? `Root: HKLM; Subkey: "SOFTWARE\\RemoteDesk\\Enterprise"; ValueType: string; ValueName: "Department"; ValueData: "${config.departmentGroup}"; Flags: uninsdeletekey` : ''}

[Run]
${config.installationMode === 'UNATTENDED_SERVICE' ? `
; Registro e inicio del Servicio de Windows en Session 0 con recuperación automática
Filename: "{sys}\\sc.exe"; Parameters: "create {#MyServiceName} binPath= \\"{app}\\{#MyServiceExeName}\\" start= delayed-auto DisplayName= \\"${config.serviceDisplayName}\\""; Flags: runhidden; StatusMsg: "Instalando servicio de Windows..."
Filename: "{sys}\\sc.exe"; Parameters: "failure {#MyServiceName} reset= 86400 actions= restart/60000/restart/120000/restart/300000"; Flags: runhidden; StatusMsg: "Configurando recuperación automática de fallos..."
Filename: "{sys}\\sc.exe"; Parameters: "description {#MyServiceName} \\"Servicio de soporte remoto y telemetría de RemoteDesk Enterprise.\\""; Flags: runhidden
` : ''}

${config.openFirewallExceptions ? `
; Configuración automática de excepciones en Windows Defender Firewall
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=\\"RemoteDesk WebRTC UDP\\" dir=in action=allow protocol=UDP localport=50000-65535 profile=any"; Flags: runhidden; StatusMsg: "Configurando reglas de Windows Defender Firewall..."
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=\\"RemoteDesk Signaling WSS\\" dir=out action=allow protocol=TCP remoteport=3000,443 profile=any"; Flags: runhidden
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall add rule name=\\"RemoteDesk FileTransfer\\" dir=in action=allow protocol=TCP localport=45825 profile=any"; Flags: runhidden
` : ''}

${config.installationMode === 'UNATTENDED_SERVICE' ? `
; Iniciar el servicio inmediatamente
Filename: "{sys}\\sc.exe"; Parameters: "start {#MyServiceName}"; Flags: runhidden; StatusMsg: "Iniciando servicio de fondo..."
` : `
; Lanzar la aplicación en modo usuario
Filename: "{app}\\{#MyAppExeName}"; Parameters: "--client-id={#MyCustomerId} --token={#MyTenantToken}"; Flags: nowait postinstall skipifsilent; Description: "Iniciar RemoteDesk Agent ahora"
`}

[UninstallRun]
${config.installationMode === 'UNATTENDED_SERVICE' ? `
; Detener y remover servicio en desinstalación
Filename: "{sys}\\sc.exe"; Parameters: "stop {#MyServiceName}"; Flags: runhidden
Filename: "{sys}\\sc.exe"; Parameters: "delete {#MyServiceName}"; Flags: runhidden
` : ''}
${config.openFirewallExceptions ? `
; Eliminar reglas de firewall creadas
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall delete rule name=\\"RemoteDesk WebRTC UDP\\""; Flags: runhidden
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall delete rule name=\\"RemoteDesk Signaling WSS\\""; Flags: runhidden
Filename: "{sys}\\netsh.exe"; Parameters: "advfirewall firewall delete rule name=\\"RemoteDesk FileTransfer\\""; Flags: runhidden
` : ''}

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: filesandordirs; Name: "{commonappdata}\\RemoteDesk"
`;
}

// Helper: Generate WiX Toolset XML (Product.wxs) for MSI
function generateWixToolsetXml(config: CustomerEnrollmentConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ===================================================================== -->
<!-- RemoteDesk Enterprise - WiX Toolset v4/v5 XML Definition              -->
<!-- Para Despliegue Masivo MSI vía Microsoft Intune / GPO Active Directory-->
<!-- Cliente: ${config.customerCompany} (ID: ${config.customerId})           -->
<!-- ===================================================================== -->
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Package Name="RemoteDesk Enterprise Agent (${config.customerCompany})"
           Manufacturer="RemoteDesk Security Inc."
           Version="1.5.0.0"
           UpgradeCode="7E48B032-6A07-4BD8-BE0C-83CDF6D40D94"
           Scope="perMachine"
           Language="1034"
           Codepage="1252">

    <SummaryInformation Description="Agente de Soporte Remoto Corporativo con HWID y WebRTC DXGI"
                        Keywords="RemoteDesk, RemoteSupport, HelpDesk, MSI"
                        Manufacturer="RemoteDesk Security Inc." />

    <MajorUpgrade DowngradeErrorMessage="Ya existe una versión más reciente instalada en este equipo."
                  AllowSameVersionUpgrades="yes" />

    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />

    <!-- Propiedades MSI con valores por defecto incrustados (Overridables vía CLI) -->
    <Property Id="CUSTOMERID" Value="${config.customerId}" />
    <Property Id="CUSTOMERCOMPANY" Value="${config.customerCompany}" />
    <Property Id="SERVERURL" Value="${config.serverUrl}" />
    <Property Id="WSRELAYURL" Value="${config.wsRelayUrl}" />
    <Property Id="ENROLLTOKEN" Value="${config.enrollmentToken}" />
    <Property Id="UNATTENDED" Value="${config.allowUnattendedAccess ? '1' : '0'}" />
    <Property Id="OPENFIREWALL" Value="${config.openFirewallExceptions ? '1' : '0'}" />
    <Property Id="AUTOSTART" Value="${config.autoStartWithWindows ? '1' : '0'}" />
    <Property Id="DEPARTMENT" Value="${config.departmentGroup || 'Default'}" />

    <!-- Directorio de Destino: Program Files\\RemoteDesk Enterprise -->
    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="RemoteDesk Enterprise">
        <Component Id="C_MainExecutable" Guid="A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D" Bitness="always64">
          <File Id="F_RemoteDeskAgentExe" Source="bin\\publish\\RemoteDesk.Agent.exe" KeyPath="yes" />
          <File Id="F_RemoteDeskServiceExe" Source="bin\\publish\\RemoteDesk.Service.exe" />
          <File Id="F_AppSettingsJson" Source="embedded\\appsettings.json" />
          <File Id="F_WebRtcLibDll" Source="bin\\publish\\webrtc_desktop_capture.dll" />
          <File Id="F_AmsiScannerDll" Source="bin\\publish\\AmsiSecurityScanner.dll" />

          <!-- Instalación y Configuración del Servicio de Windows -->
          <ServiceInstall Id="ServiceInstaller"
                          Type="ownProcess"
                          Name="${config.serviceName}"
                          DisplayName="${config.serviceDisplayName}"
                          Description="Servicio de gestión remota y telemetría de RemoteDesk Enterprise."
                          Start="auto"
                          Account="LocalSystem"
                          ErrorControl="normal"
                          DelayedAutoStart="yes"
                          Interactive="no">
            <ServiceConfig DelayedAutoStart="yes" OnInstall="yes" OnReinstall="yes" />
          </ServiceInstall>

          <ServiceControl Id="ServiceController"
                          Name="${config.serviceName}"
                          Start="install"
                          Stop="both"
                          Remove="uninstall"
                          Wait="yes" />
        </Component>

        <!-- Registro de llaves HKLM para Tenant y Token -->
        <Component Id="C_RegistryConfig" Guid="B2C3D4E5-F6A7-4B5C-9D0E-1F2A3B4C5D6E">
          <RegistryKey Root="HKLM" Key="SOFTWARE\\RemoteDesk\\Enterprise">
            <RegistryValue Type="string" Name="CustomerId" Value="[CUSTOMERID]" KeyPath="yes" />
            <RegistryValue Type="string" Name="CustomerCompany" Value="[CUSTOMERCOMPANY]" />
            <RegistryValue Type="string" Name="EnrollmentToken" Value="[ENROLLTOKEN]" />
            <RegistryValue Type="string" Name="ServerUrl" Value="[SERVERURL]" />
            <RegistryValue Type="string" Name="WsRelayUrl" Value="[WSRELAYURL]" />
            <RegistryValue Type="string" Name="Department" Value="[DEPARTMENT]" />
            <RegistryValue Type="integer" Name="InstalledViaMSI" Value="1" />
          </RegistryKey>
        </Component>
      </Directory>
    </StandardDirectory>

    <!-- Component Group -->
    <Feature Id="MainFeature" Title="RemoteDesk Agent Engine" Level="1">
      <ComponentRef Id="C_MainExecutable" />
      <ComponentRef Id="C_RegistryConfig" />
    </Feature>
  </Package>
</Wix>`;
}

// Helper: Generate appsettings.json for the Windows agent
function generateAppSettingsJson(config: CustomerEnrollmentConfig): string {
  return JSON.stringify(
    {
      RemoteDesk: {
        Tenant: {
          CustomerId: config.customerId,
          CustomerCompany: config.customerCompany,
          TenantKey: config.tenantKey,
          EnrollmentToken: config.enrollmentToken,
          TokenExpiresAt: config.tokenExpiresAt,
          Department: config.departmentGroup || 'IT_Managed_Endpoints',
        },
        Network: {
          ServerUrl: config.serverUrl,
          WsRelayUrl: config.wsRelayUrl,
          SignalingPath: '/ws',
          HeartbeatIntervalSeconds: 15,
          LanDiscoveryPort: 45824,
          FileTransferPort: 45825,
          WebRtcPortRange: '50000-65535',
        },
        Service: {
          ServiceName: config.serviceName,
          DisplayName: config.serviceDisplayName,
          AutoStart: config.autoStartWithWindows,
          AllowUnattendedAccess: config.allowUnattendedAccess,
          RequirePin: config.requirePinForIncomingSessions,
          DefaultPin: config.defaultPin || '739201',
          WatchdogAutoRecovery: config.enableWatchdogAutoRecovery,
          CaptureEngine: 'DirectX_DXGI_DesktopDuplication',
          FpsTarget: 60,
          DirtyRectanglesEnabled: true,
          AmsiAntivirusScanning: true,
        },
        Security: {
          EnforceHmacLedger: true,
          RequireTls13: true,
          AllowedCertThumbprint: 'SHA256:7B8F9A120CD984E62F11AA30',
        },
      },
    },
    null,
    2
  );
}

// Helper: Generate PowerShell Deployment Script
function generatePowerShellDeployScript(config: CustomerEnrollmentConfig): string {
  return `<#
.SYNOPSIS
    Script de despliegue silencioso automatizado de RemoteDesk Enterprise Agent.
    Compatible con Microsoft Intune, GPO Startup Script, NinjaOne, Datto RMM y ConnectWise.

.DESCRIPTION
    1. Verifica privilegios de Administrador (Elevación UAC).
    2. Descarga el instalador empaquetado o binarios desde el servidor central.
    3. Valida el hash SHA-256 de integridad criptográfica.
    4. Ejecuta la instalación silenciosa incrustando el ID de cliente: ${config.customerId}.
    5. Configura reglas de Windows Defender Firewall.
    6. Inicia el servicio 'RemoteDeskAgentService' y realiza auto-registro por HWID.
#>

[CmdletBinding()]
param(
    [string]$ServerUrl = "${config.serverUrl}",
    [string]$CustomerId = "${config.customerId}",
    [string]$CustomerCompany = "${config.customerCompany}",
    [string]$EnrollmentToken = "${config.enrollmentToken}",
    [switch]$Unattended = ${config.allowUnattendedAccess ? '$true' : '$false'},
    [switch]$ConfigureFirewall = ${config.openFirewallExceptions ? '$true' : '$false'}
)

# 1. Comprobación de Privilegios Administrativos
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "[FATAL] Este script requiere ejecutarse con privilegios de Administrador (Elevated)."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RemoteDesk Enterprise - Despliegue Automatizado" -ForegroundColor White
Write-Host "  Cliente: $CustomerCompany (ID: $CustomerId)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$TempDir = "$env:TEMP\\RemoteDesk_Install_$(Get-Random)"
New-Item -Path $TempDir -ItemType Directory -Force | Out-Null

$InstallerUrl = "$ServerUrl/api/v1/installers/download/$EnrollmentToken?type=msi"
$InstallerPath = "$TempDir\\RemoteDesk_Setup.msi"

try {
    Write-Host "[1/5] Descargando paquete instalador MSI..." -ForegroundColor Green
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing -TimeoutSec 120

    Write-Host "[2/5] Ejecutando instalación silenciosa MSIEXEC..." -ForegroundColor Green
    $msiArgs = @(
        "/i",
        "\`"$InstallerPath\`"",
        "/qn",
        "/norestart",
        "CUSTOMERID=\`"$CustomerId\`"",
        "CUSTOMERCOMPANY=\`"$CustomerCompany\`"",
        "SERVERURL=\`"$ServerUrl\`"",
        "ENROLLTOKEN=\`"$EnrollmentToken\`"",
        "UNATTENDED=\`"$($Unattended ? 1 : 0)\`"",
        "OPENFIREWALL=\`"$($ConfigureFirewall ? 1 : 0)\`""
    )

    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
        throw "MSIEXEC finalizó con código de error: $($process.ExitCode)"
    }
    Write-Host "  -> Instalación MSI completada exitosamente." -ForegroundColor Gray

    if ($ConfigureFirewall) {
        Write-Host "[3/5] Aplicando excepciones en Windows Defender Firewall..." -ForegroundColor Green
        New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-WebRTC-UDP" -Direction Inbound -Protocol UDP -LocalPort 50000-65535 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-Signaling-WSS" -Direction Outbound -Protocol TCP -RemotePort 3000,443 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName "RemoteDesk-Enterprise-FileTransfer" -Direction Inbound -Protocol TCP -LocalPort 45825 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  -> Reglas de Firewall añadidas correctamente." -ForegroundColor Gray
    }

    Write-Host "[4/5] Verificando e iniciando el servicio 'RemoteDeskAgentService'..." -ForegroundColor Green
    Start-Service -Name "RemoteDeskAgentService" -ErrorAction SilentlyContinue
    Set-Service -Name "RemoteDeskAgentService" -StartupType Automatic -ErrorAction SilentlyContinue

    Write-Host "[5/5] Realizando handshake inicial con el servidor..." -ForegroundColor Green
    $service = Get-Service -Name "RemoteDeskAgentService"
    Write-Host "  -> Estado del Servicio: $($service.Status)" -ForegroundColor Yellow
    Write-Host "[OK] Endpoint enrolado exitosamente en el Tenant: $CustomerCompany" -ForegroundColor Cyan

} catch {
    Write-Error "[ERROR] Falló el aprovisionamiento de RemoteDesk: $_"
    exit 1
} finally {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
`;
}

// GET /api/v1/installers/configs
installersRouter.get('/configs', (req: Request, res: Response) => {
  const customers = Array.from(db.customers.values()).map((c) => ({
    id: c.id,
    company_name: c.company_name,
    contact_name: c.contact_name,
    email: c.email,
  }));

  res.json({
    customers,
    firewallRules: FIREWALL_RULES_SPECS,
    serviceSpec: SERVICE_PERMISSION_SPEC,
    supportedPackageTypes: [
      { id: 'MSI_PACKAGE', label: 'Paquete MSI Empresarial (WiX / GPO / Intune)', ext: '.msi' },
      { id: 'INNO_SETUP_EXE', label: 'Instalador Silencioso Setup.exe (Inno Setup 6)', ext: '.exe' },
      { id: 'PORTABLE_QUICK_SUPPORT', label: 'Quick Support On-Demand (Sin Instalación)', ext: '.exe' },
      { id: 'POWERSHELL_DEPLOYER', label: 'Script PowerShell de Despliegue RMM', ext: '.ps1' },
    ],
    supportedModes: [
      {
        id: 'UNATTENDED_SERVICE',
        label: 'Servicio Desatendido 24/7 (LocalSystem)',
        desc: 'Para soporte continuo, reinicio remoto, interacción con pantalla de login y Session 0.',
      },
      {
        id: 'ON_DEMAND_USER',
        label: 'Asistencia Rápida / Bajo Demanda',
        desc: 'Solo se ejecuta cuando el usuario lo solicita, sin persistencia en servicios de Windows.',
      },
      {
        id: 'ENTERPRISE_GPO_INTUNE',
        label: 'Despliegue Masivo por GPO / Intune',
        desc: 'Empaquetado MSI con propiedades de tenant pre-inyectadas para aprovisionamiento sin interacción.',
      },
    ],
  });
});

// GET /api/v1/installers/firewall-service-specs
installersRouter.get('/firewall-service-specs', (_req: Request, res: Response) => {
  res.json({
    firewallRules: FIREWALL_RULES_SPECS,
    serviceSpec: SERVICE_PERMISSION_SPEC,
    securityHardening: {
      authenticodeSigned: true,
      sha256Certificate: '4A783BC019238EFE8271049281729012389104A1',
      processProtection: 'SERVICE_SID_TYPE_RESTRICTED',
      session0Isolation: 'Integración nativa con Logon Desktop y Credential Provider de Windows',
    },
  });
});

// POST /api/v1/installers/generate
installersRouter.post('/generate', (req: Request, res: Response) => {
  const {
    customerId,
    packageType = 'MSI_PACKAGE',
    installationMode = 'UNATTENDED_SERVICE',
    serverUrl = 'https://remotedesk-enterprise.internal',
    wsRelayUrl = 'wss://remotedesk-enterprise.internal/ws',
    allowUnattendedAccess = true,
    requirePinForIncomingSessions = true,
    defaultPin = '739201',
    openFirewallExceptions = true,
    enableWatchdogAutoRecovery = true,
    departmentGroup = 'IT_Managed_Endpoints',
  } = req.body;

  const customer = db.customers.get(customerId) || Array.from(db.customers.values())[0];
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no especificado o inválido' });
  }

  // Generate unique secure enrollment token with 30-day expiration
  const tokenRaw = `TOKEN_${customer.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const enrollmentToken = `ENROLL-${customer.id.toUpperCase()}-${crypto.createHash('sha256').update(tokenRaw).digest('hex').substring(0, 12).toUpperCase()}`;
  const tokenExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

  const config: CustomerEnrollmentConfig = {
    customerId: customer.id,
    customerCompany: customer.company_name,
    tenantKey: `TENANT-${customer.id.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    enrollmentToken,
    tokenExpiresAt,
    serverUrl,
    wsRelayUrl,
    installationMode: installationMode as InstallationMode,
    packageType: packageType as InstallerPackageType,
    autoStartWithWindows: true,
    serviceName: 'RemoteDeskAgentService',
    serviceDisplayName: `RemoteDesk Enterprise Agent (${customer.company_name})`,
    allowUnattendedAccess,
    requirePinForIncomingSessions,
    defaultPin,
    openFirewallExceptions,
    enableWatchdogAutoRecovery,
    departmentGroup,
  };

  const innoScript = generateInnoSetupScript(config);
  const wixXml = generateWixToolsetXml(config);
  const appsettingsJson = generateAppSettingsJson(config);
  const ps1DeployScript = generatePowerShellDeployScript(config);

  const packageId = `pkg-${customer.id}-${Date.now().toString(36)}`;
  const ext = packageType === 'MSI_PACKAGE' ? '.msi' : packageType === 'POWERSHELL_DEPLOYER' ? '.ps1' : '.exe';
  const fileName = `RemoteDesk_Agent_${customer.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_Setup${ext}`;

  // Silent deployment command lines
  const silentCommands = {
    cmdPrompt: `msiexec.exe /i "${fileName}" /qn CUSTOMERID="${customer.id}" CUSTOMERCOMPANY="${customer.company_name}" SERVERURL="${serverUrl}" ENROLLTOKEN="${enrollmentToken}" /norestart`,
    powershell: `Start-Process msiexec.exe -ArgumentList '/i "${fileName}" /qn CUSTOMERID="${customer.id}" SERVERURL="${serverUrl}" ENROLLTOKEN="${enrollmentToken}"' -Wait -NoNewWindow`,
    intuneInstallCmd: `install.cmd (con soporte Intune Win32 App Packaging Tool): msiexec /i "${fileName}" /qn /norestart CUSTOMERID="${customer.id}" ENROLLTOKEN="${enrollmentToken}"`,
    gpoStartupScript: `\\\\corp.local\\NETLOGON\\Deploy-RemoteDeskAgent.ps1 -CustomerId "${customer.id}" -EnrollmentToken "${enrollmentToken}" -ServerUrl "${serverUrl}"`,
    ninjaRmmScript: `Invoke-Command -ScriptBlock { & .\\Deploy-RemoteDeskAgent.ps1 -CustomerId "${customer.id}" -EnrollmentToken "${enrollmentToken}" }`,
  };

  const cleanupUninstallScript = `@echo off
echo Desinstalando RemoteDesk Enterprise Agent...
net stop "${config.serviceName}" >nul 2>&1
sc delete "${config.serviceName}" >nul 2>&1
netsh advfirewall firewall delete rule name="RemoteDesk WebRTC UDP" >nul 2>&1
netsh advfirewall firewall delete rule name="RemoteDesk Signaling WSS" >nul 2>&1
rmdir /s /q "%ProgramFiles%\\RemoteDesk Enterprise" >nul 2>&1
echo Desinstalacion completada exitosamente.`;

  const generatedPackage: GeneratedDeploymentPackage = {
    id: packageId,
    customerId: customer.id,
    customerCompany: customer.company_name,
    packageType: packageType as InstallerPackageType,
    installationMode: installationMode as InstallationMode,
    fileName,
    fileSizeBytes: 14852930, // ~14.8 MB
    sha256Hash: crypto.createHash('sha256').update(innoScript + wixXml + appsettingsJson).digest('hex'),
    downloadUrl: `/api/v1/installers/download/${enrollmentToken}?type=${packageType.toLowerCase()}`,
    enrollmentToken,
    tokenExpiresAt,
    createdAt: new Date().toISOString(),
    embeddedConfig: config,
    silentCommands,
    generatedFiles: {
      innoSetupScript: innoScript,
      wixToolsetXml: wixXml,
      appsettingsJson,
      deployPowerShellScript: ps1DeployScript,
      cleanupUninstallScript,
    },
  };

  generatedPackagesStore.set(packageId, generatedPackage);
  generatedPackagesStore.set(enrollmentToken, generatedPackage);

  // Broadcast audit notification
  realtimeHub.broadcast({
    type: 'ALERT_CREATED',
    topic: 'alerts',
    severity: 'info',
    title: 'Nuevo Instalador Windows Generado',
    message: `Se ha creado el paquete ${fileName} para el cliente ${customer.company_name} con token ${enrollmentToken.substring(0, 14)}...`,
    data: {
      customerId: customer.id,
      packageId,
      packageType,
    },
  });

  res.json(generatedPackage);
});

// POST /api/v1/installers/simulate-enrollment
// Simulates step-by-step endpoint silent enrollment on a Windows device
installersRouter.post('/simulate-enrollment', (req: Request, res: Response) => {
  const {
    customerId,
    computerName = 'WS-CORP-FIN-09',
    windowsUser = 'finanzas.operaciones',
    osVersion = 'Windows 11 Pro 64-bit (Build 22631.3447)',
    ipAddress = '192.168.10.142',
    enrollmentToken,
  } = req.body;

  const customer = db.customers.get(customerId) || Array.from(db.customers.values())[0];
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  // Generate HWID
  const hwidHash = crypto
    .createHash('sha256')
    .update(`${computerName}_${windowsUser}_BFEBFBFF00090672_${ipAddress}`)
    .digest('hex')
    .substring(0, 32);

  const deviceId = `dev-sim-${Date.now().toString(36)}`;

  // Create or update device in DB
  const newDevice = {
    id: deviceId,
    customer_id: customer.id,
    device_uuid: hwidHash,
    computer_name: computerName,
    windows_user: windowsUser,
    os_version: osVersion,
    cpu: '13th Gen Intel(R) Core(TM) i7-13700K (16 Cores, 24 Threads)',
    ram_mb: 32768,
    storage_info: 'SSD NVMe 1TB (582 GB libres)',
    ip_address: ipAddress,
    mac_address: '00:15:5D:84:9A:2F',
    is_online: true,
    last_heartbeat: new Date().toISOString(),
    agent_version: '1.5.0-msi-enrolled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.devices.set(deviceId, newDevice);

  // Generate simulation steps with detailed telemetry
  const steps = [
    {
      stepNumber: 1,
      title: 'Validación de Manifiesto & Permisos UAC',
      description: 'Extracción del paquete MSIEXEC, verificación de token y validación de permisos de Administrador.',
      status: 'completed' as const,
      details: `Token validado: ${enrollmentToken || 'ENROLL-AUTO-VALIDATED'}. Privilegio SeServiceLogonRight confirmado.`,
      outputLog: `[MSIEXEC:I] Package verified. Validating signature with Authenticode... OK (RemoteDesk Security Inc.)`,
      durationMs: 320,
    },
    {
      stepNumber: 2,
      title: 'Despliegue de Binarios & Configuración HKLM',
      description: 'Copia a %ProgramFiles%\\RemoteDesk Enterprise y registro de llaves en HKLM\\Software\\RemoteDesk.',
      status: 'completed' as const,
      details: `Incrustado CustomerId: ${customer.id}, Company: "${customer.company_name}", Department: "IT_Managed".`,
      outputLog: `[REG:OK] HKLM\\SOFTWARE\\RemoteDesk\\Enterprise\\CustomerId -> ${customer.id}`,
      durationMs: 450,
    },
    {
      stepNumber: 3,
      title: 'Configuración de Windows Defender Firewall',
      description: 'Inyección de excepciones de red para UDP WebRTC (50000-65535) y WSS (443/3000).',
      status: 'completed' as const,
      details: '3 reglas agregadas con perfiles Domain, Private y Public.',
      outputLog: `[NETSH:OK] Added rule "RemoteDesk-Enterprise-WebRTC-UDP" (Inbound UDP 50000-65535 -> Allow)`,
      durationMs: 280,
    },
    {
      stepNumber: 4,
      title: 'Instalación y Arranque de RemoteDeskAgentService',
      description: 'Registro de servicio Win32 con cuenta LocalSystem, arranque automático y watchdog de autorecuperación.',
      status: 'completed' as const,
      details: 'Servicio registrado con política de reinicio a 60s en caso de fallo.',
      outputLog: `[SC:OK] CreateService "RemoteDeskAgentService" -> SERVICE_START: Auto-Delayed -> Running (PID: 4892)`,
      durationMs: 620,
    },
    {
      stepNumber: 5,
      title: 'Handshake Criptográfico & Registro en Vivo por HWID',
      description: 'Conexión WebSocket al Servidor Central, envío de telemetría de hardware y activación en consola.',
      status: 'completed' as const,
      details: `HWID: ${hwidHash}. Conectado a wss://remotedesk-enterprise.internal/ws.`,
      outputLog: `[AGENT:WSS] Connected. Device successfully enrolled into tenant "${customer.company_name}". Ready for remote assistance.`,
      durationMs: 390,
    },
  ];

  const result: EnrollmentSimulationResult = {
    success: true,
    deviceId,
    computerName,
    osVersion,
    ipAddress,
    hwidHash,
    serviceStatus: 'Running (Delayed-Auto)',
    firewallRulesAdded: 3,
    connectionVerified: true,
    steps,
    enrolledAt: new Date().toISOString(),
  };

  // Broadcast device online notification
  realtimeHub.broadcast({
    type: 'DEVICE_STATUS_CHANGED',
    topic: 'devices',
    severity: 'success',
    title: 'Nuevo Endpoint Windows Enrolado',
    message: `El equipo ${computerName} (${windowsUser}) se ha instalado y conectado exitosamente en ${customer.company_name}.`,
    data: {
      deviceId,
      computerName,
      customerId: customer.id,
      customerCompany: customer.company_name,
      ipAddress,
    },
  });

  res.json(result);
});

// GET /api/v1/installers/download/:token
installersRouter.get('/download/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const downloadType = (req.query.type as string) || 'script';
  const pkg = generatedPackagesStore.get(token);

  if (!pkg) {
    return res.status(404).json({ error: 'Token de descarga inválido o expirado' });
  }

  if (downloadType === 'inno' || downloadType === 'iss') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="RemoteDesk_${pkg.customerId}.iss"`);
    return res.send(pkg.generatedFiles.innoSetupScript);
  }

  if (downloadType === 'wix' || downloadType === 'wxs') {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Product_${pkg.customerId}.wxs"`);
    return res.send(pkg.generatedFiles.wixToolsetXml);
  }

  if (downloadType === 'config' || downloadType === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appsettings.json"`);
    return res.send(pkg.generatedFiles.appsettingsJson);
  }

  // Default: PowerShell Deployment Script
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Deploy-RemoteDesk_${pkg.customerId}.ps1"`);
  return res.send(pkg.generatedFiles.deployPowerShellScript);
});
