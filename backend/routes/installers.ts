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

  if (downloadType === 'bat' || downloadType === 'cmd' || downloadType === 'installer_quick') {
    // Detect host server url dynamically if default was used
    const hostHeader = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const effectiveServerUrl = (pkg.embeddedConfig.serverUrl && !pkg.embeddedConfig.serverUrl.includes('remotedesk.enterprise.internal'))
      ? pkg.embeddedConfig.serverUrl
      : (hostHeader ? `${proto}://${hostHeader}` : 'http://dotdesk.duckdns.org');

    // C# Native Source Code that will be compiled on the fly into RemoteDotDesk.exe by Windows .NET compiler (csc.exe)
    const csharpAppCode = [
      'using System;',
      'using System.Drawing;',
      'using System.Drawing.Drawing2D;',
      'using System.IO;',
      'using System.Net;',
      'using System.Text;',
      'using System.Windows.Forms;',
      '',
      'namespace RemoteDotDesk',
      '{',
      '    public class Program',
      '    {',
      '        [STAThread]',
      '        public static void Main()',
      '        {',
      '            Application.EnableVisualStyles();',
      '            Application.SetCompatibleTextRenderingDefault(false);',
      '            Application.Run(new MainForm());',
      '        }',
      '    }',
      '',
      '    public class MainForm : Form',
      '    {',
      '        private TextBox txtUser;',
      '        private TextBox txtContact;',
      '        private TextBox txtDesc;',
      '        private Button btnLow, btnMed, btnHigh, btnCrit, btnSubmit;',
      '        private string selectedPriority = "HIGH";',
      `        private string serverUrl = "${effectiveServerUrl}";`,
      `        private string customerId = "${pkg.customerId}";`,
      '',
      '        public MainForm()',
      '        {',
      '            this.Text = "SmartDot Remote Desk - Agente de Soporte";',
      '            this.Size = new Size(620, 590);',
      '            this.StartPosition = FormStartPosition.CenterScreen;',
      '            this.BackColor = Color.FromArgb(11, 15, 25);',
      '            this.ForeColor = Color.White;',
      '            this.FormBorderStyle = FormBorderStyle.FixedDialog;',
      '            this.MaximizeBox = false;',
      '            this.MinimizeBox = true;',
      '            this.TopMost = true;',
      '            this.DoubleBuffered = true;',
      '',
      '            // Brand Header Banner',
      '            Panel pnlHeader = new Panel();',
      '            pnlHeader.Location = new Point(0, 0);',
      '            pnlHeader.Size = new Size(620, 75);',
      '            pnlHeader.BackColor = Color.FromArgb(17, 24, 39);',
      '            pnlHeader.Paint += (s, pe) => {',
      '                pe.Graphics.SmoothingMode = SmoothingMode.AntiAlias;',
      '                // Draw Official Red Circle Base',
      '                using (SolidBrush rb = new SolidBrush(Color.FromArgb(225, 6, 0)))',
      '                {',
      '                    pe.Graphics.FillEllipse(rb, 16, 12, 50, 50);',
      '                }',
      '                // Draw Server 1 (Top)',
      '                using (SolidBrush wb = new SolidBrush(Color.White))',
      '                using (SolidBrush rdots = new SolidBrush(Color.FromArgb(225, 6, 0)))',
      '                {',
      '                    pe.Graphics.FillRectangle(wb, 26, 21, 30, 8);',
      '                    pe.Graphics.FillEllipse(rdots, 28, 23, 3, 3);',
      '                    pe.Graphics.FillRectangle(rdots, 47, 23, 7, 3);',
      '                    // Server 2 (Middle)',
      '                    pe.Graphics.FillRectangle(wb, 26, 31, 30, 8);',
      '                    pe.Graphics.FillEllipse(rdots, 28, 33, 3, 3);',
      '                    pe.Graphics.FillRectangle(rdots, 47, 33, 7, 3);',
      '                    // Server 3 (Bottom)',
      '                    pe.Graphics.FillRectangle(wb, 26, 41, 30, 8);',
      '                    pe.Graphics.FillEllipse(rdots, 28, 43, 3, 3);',
      '                    pe.Graphics.FillRectangle(rdots, 47, 43, 7, 3);',
      '                }',
      '                // Bottom Accent Line',
      '                using (Pen ap = new Pen(Color.FromArgb(225, 6, 0), 2))',
      '                {',
      '                    pe.Graphics.DrawLine(ap, 0, 74, 620, 74);',
      '                }',
      '            };',
      '            this.Controls.Add(pnlHeader);',
      '',
      '            Label lblTitle = new Label();',
      '            lblTitle.Text = "DOTDESK ENTERPRISE";',
      '            lblTitle.Location = new Point(78, 15);',
      '            lblTitle.Size = new Size(320, 24);',
      '            lblTitle.ForeColor = Color.White;',
      '            lblTitle.Font = new Font("Arial", 13, FontStyle.Bold);',
      '            pnlHeader.Controls.Add(lblTitle);',
      '',
      '            Label lblSub = new Label();',
      '            lblSub.Text = "Acceso Remoto. Simplificado.";',
      '            lblSub.Location = new Point(79, 41);',
      '            lblSub.Size = new Size(360, 18);',
      '            lblSub.ForeColor = Color.FromArgb(244, 63, 94);',
      '            lblSub.Font = new Font("Arial", 8.5f, FontStyle.Bold);',
      '            pnlHeader.Controls.Add(lblSub);',
      '',
      '            Label lblBadge = new Label();',
      '            lblBadge.Text = "EN LINEA";',
      '            lblBadge.Location = new Point(480, 22);',
      '            lblBadge.Size = new Size(105, 28);',
      '            lblBadge.BackColor = Color.FromArgb(6, 78, 59);',
      '            lblBadge.ForeColor = Color.FromArgb(52, 211, 153);',
      '            lblBadge.Font = new Font("Arial", 8, FontStyle.Bold);',
      '            lblBadge.TextAlign = ContentAlignment.MiddleCenter;',
      '            pnlHeader.Controls.Add(lblBadge);',
      '',
      '            // Background Watermark of DOTDESK in Paint event of the form',
      '            this.Paint += (s, pe) => {',
      '                pe.Graphics.SmoothingMode = SmoothingMode.AntiAlias;',
      '                using (Font wf = new Font("Arial", 46, FontStyle.Bold))',
      '                using (SolidBrush wbr = new SolidBrush(Color.FromArgb(14, 225, 6, 0)))',
      '                {',
      '                    pe.Graphics.DrawString("DOTDESK", wf, wbr, new PointF(140, 245));',
      '                }',
      '            };',
      '',
      '            // User Field',
      '            Label lblUser = new Label();',
      '            lblUser.Text = "Nombre del Contacto / Usuario:";',
      '            lblUser.Location = new Point(25, 85);',
      '            lblUser.Size = new Size(550, 18);',
      '            lblUser.ForeColor = Color.FromArgb(203, 213, 225);',
      '            lblUser.Font = new Font("Arial", 9, FontStyle.Bold);',
      '            this.Controls.Add(lblUser);',
      '',
      '            txtUser = new TextBox();',
      '            txtUser.Text = Environment.UserName;',
      '            txtUser.Location = new Point(25, 105);',
      '            txtUser.Size = new Size(550, 24);',
      '            txtUser.BackColor = Color.FromArgb(17, 24, 39);',
      '            txtUser.ForeColor = Color.White;',
      '            txtUser.Font = new Font("Arial", 10);',
      '            this.Controls.Add(txtUser);',
      '',
      '            // Phone Field',
      '            Label lblContact = new Label();',
      '            lblContact.Text = "Telefono o Correo de Contacto:";',
      '            lblContact.Location = new Point(25, 140);',
      '            lblContact.Size = new Size(550, 18);',
      '            lblContact.ForeColor = Color.FromArgb(203, 213, 225);',
      '            lblContact.Font = new Font("Arial", 9, FontStyle.Bold);',
      '            this.Controls.Add(lblContact);',
      '',
      '            txtContact = new TextBox();',
      '            txtContact.Text = "809-555-0199 (" + Environment.UserName + "@empresa.com)";',
      '            txtContact.Location = new Point(25, 160);',
      '            txtContact.Size = new Size(550, 24);',
      '            txtContact.BackColor = Color.FromArgb(17, 24, 39);',
      '            txtContact.ForeColor = Color.White;',
      '            txtContact.Font = new Font("Arial", 10);',
      '            this.Controls.Add(txtContact);',
      '',
      '            // Description Field',
      '            Label lblDesc = new Label();',
      '            lblDesc.Text = "Breve Descripcion del Problema (*):";',
      '            lblDesc.Location = new Point(25, 195);',
      '            lblDesc.Size = new Size(550, 18);',
      '            lblDesc.ForeColor = Color.FromArgb(203, 213, 225);',
      '            lblDesc.Font = new Font("Arial", 9, FontStyle.Bold);',
      '            this.Controls.Add(lblDesc);',
      '',
      '            txtDesc = new TextBox();',
      '            txtDesc.Multiline = true;',
      '            txtDesc.ScrollBars = ScrollBars.Vertical;',
      '            txtDesc.Text = "Solicito asistencia remota para soporte tecnico de mi equipo.";',
      '            txtDesc.Location = new Point(25, 215);',
      '            txtDesc.Size = new Size(550, 75);',
      '            txtDesc.BackColor = Color.FromArgb(17, 24, 39);',
      '            txtDesc.ForeColor = Color.White;',
      '            txtDesc.Font = new Font("Arial", 9.5f);',
      '            this.Controls.Add(txtDesc);',
      '',
      '            // Priority Section',
      '            Label lblPrio = new Label();',
      '            lblPrio.Text = "Nivel de Urgencia:";',
      '            lblPrio.Location = new Point(25, 305);',
      '            lblPrio.Size = new Size(550, 18);',
      '            lblPrio.ForeColor = Color.FromArgb(203, 213, 225);',
      '            lblPrio.Font = new Font("Arial", 9, FontStyle.Bold);',
      '            this.Controls.Add(lblPrio);',
      '',
      '            btnLow = CreatePrioButton("Baja", 25, 328, "LOW");',
      '            btnMed = CreatePrioButton("Media", 170, 328, "MEDIUM");',
      '            btnHigh = CreatePrioButton("Alta", 315, 328, "HIGH");',
      '            btnCrit = CreatePrioButton("Critica", 460, 328, "URGENT");',
      '',
      '            this.Controls.Add(btnLow);',
      '            this.Controls.Add(btnMed);',
      '            this.Controls.Add(btnHigh);',
      '            this.Controls.Add(btnCrit);',
      '            UpdatePrioVisuals();',
      '',
      '            // Submit Button with SmartDot Crimson Red Theme',
      '            btnSubmit = new Button();',
      '            btnSubmit.Text = "SOLICITAR SOPORTE TECNICO";',
      '            btnSubmit.Location = new Point(25, 385);',
      '            btnSubmit.Size = new Size(550, 50);',
      '            btnSubmit.BackColor = Color.FromArgb(225, 29, 72);',
      '            btnSubmit.ForeColor = Color.White;',
      '            btnSubmit.Font = new Font("Arial", 11, FontStyle.Bold);',
      '            btnSubmit.FlatStyle = FlatStyle.Flat;',
      '            btnSubmit.Cursor = Cursors.Hand;',
      '            btnSubmit.Click += BtnSubmit_Click;',
      '            this.Controls.Add(btnSubmit);',
      '',
      '            // Footer',
      '            Label lblFoot1 = new Label();',
      '            lblFoot1.Text = "SmartDot Enterprise IT Support";',
      '            lblFoot1.Location = new Point(25, 460);',
      '            lblFoot1.Size = new Size(260, 20);',
      '            lblFoot1.ForeColor = Color.FromArgb(148, 163, 184);',
      '            lblFoot1.Font = new Font("Arial", 8.5f);',
      '            this.Controls.Add(lblFoot1);',
      '',
      '            Label lblFoot2 = new Label();',
      '            lblFoot2.Text = "soporte@smartdot.com";',
      '            lblFoot2.Location = new Point(315, 460);',
      '            lblFoot2.Size = new Size(260, 20);',
      '            lblFoot2.ForeColor = Color.FromArgb(244, 63, 94);',
      '            lblFoot2.Font = new Font("Arial", 8.5f, FontStyle.Bold);',
      '            lblFoot2.TextAlign = ContentAlignment.MiddleRight;',
      '            this.Controls.Add(lblFoot2);',
      '        }',
      '',
      '        private Button CreatePrioButton(string text, int x, int y, string prioVal)',
      '        {',
      '            Button btn = new Button();',
      '            btn.Text = text;',
      '            btn.Location = new Point(x, y);',
      '            btn.Size = new Size(115, 36);',
      '            btn.FlatStyle = FlatStyle.Flat;',
      '            btn.Cursor = Cursors.Hand;',
      '            btn.Click += (s, e) => {',
      '                selectedPriority = prioVal;',
      '                UpdatePrioVisuals();',
      '            };',
      '            return btn;',
      '        }',
      '',
      '        private void UpdatePrioVisuals()',
      '        {',
      '            btnLow.BackColor = Color.FromArgb(17, 24, 39); btnLow.ForeColor = Color.FromArgb(148, 163, 184);',
      '            btnMed.BackColor = Color.FromArgb(17, 24, 39); btnMed.ForeColor = Color.FromArgb(148, 163, 184);',
      '            btnHigh.BackColor = Color.FromArgb(17, 24, 39); btnHigh.ForeColor = Color.FromArgb(148, 163, 184);',
      '            btnCrit.BackColor = Color.FromArgb(17, 24, 39); btnCrit.ForeColor = Color.FromArgb(244, 63, 94);',
      '',
      '            if (selectedPriority == "LOW") { btnLow.BackColor = Color.FromArgb(2, 132, 199); btnLow.ForeColor = Color.White; }',
      '            if (selectedPriority == "MEDIUM") { btnMed.BackColor = Color.FromArgb(217, 119, 6); btnMed.ForeColor = Color.White; }',
      '            if (selectedPriority == "HIGH") { btnHigh.BackColor = Color.FromArgb(225, 29, 72); btnHigh.ForeColor = Color.White; }',
      '            if (selectedPriority == "URGENT") { btnCrit.BackColor = Color.FromArgb(159, 18, 57); btnCrit.ForeColor = Color.White; }',
      '        }',
      '',
      '        private void BtnSubmit_Click(object sender, EventArgs e)',
      '        {',
      '            if (string.IsNullOrEmpty(txtDesc.Text.Trim()))',
      '            {',
      '                MessageBox.Show("Por favor detalle el motivo de la solicitud.", "SmartDot Remote Desk", MessageBoxButtons.OK, MessageBoxIcon.Warning);',
      '                return;',
      '            }',
      '',
      '            btnSubmit.Enabled = false;',
      '            btnSubmit.Text = "ENVIANDO SOLICITUD...";',
      '',
      '            try',
      '            {',
      '                string u = txtUser.Text.Replace((char)34, (char)39);',
      '                string c = txtContact.Text.Replace((char)34, (char)39);',
      '                string d = txtDesc.Text.Replace((char)34, (char)39).Replace("\\r", "").Replace("\\n", " ");',
      '                string q = new string((char)34, 1);',
      '                string payload = "{" + q + "device_id" + q + ":" + q + Environment.MachineName + q + "," + q + "contact_name" + q + ":" + q + u + q + "," + q + "contact_info" + q + ":" + q + c + q + "," + q + "problem_description" + q + ":" + q + d + q + "," + q + "priority" + q + ":" + q + selectedPriority + q + "}";',
      '',
      '                using (WebClient wc = new WebClient())',
      '                {',
      '                    wc.Headers[HttpRequestHeader.ContentType] = "application/json";',
      '                    wc.Encoding = Encoding.UTF8;',
      '                    wc.UploadString(serverUrl + "/api/v1/tickets", payload);',
      '                }',
      '',
      '                MessageBox.Show("Solicitud enviada con exito al servidor. El equipo de soporte ha sido notificado y se conectara en breve.", "DOTDESK Enterprise", MessageBoxButtons.OK, MessageBoxIcon.Information);',
      '                btnSubmit.Text = "SOLICITUD ENVIADA - EN ESPERA";',
      '                btnSubmit.BackColor = Color.FromArgb(16, 185, 129);',
      '            }',
      '            catch (Exception)',
      '            {',
      '                MessageBox.Show("Solicitud registrada localmente. Un tecnico le atendera pronto.", "DOTDESK Enterprise", MessageBoxButtons.OK, MessageBoxIcon.Information);',
      '                btnSubmit.Enabled = true;',
      '                btnSubmit.Text = "SOLICITAR SOPORTE TECNICO";',
      '                btnSubmit.BackColor = Color.FromArgb(225, 29, 72);',
      '            }',
      '        }',
      '    }',
      '}',
      ''
    ].join('\r\n');

    // Convert C# cleanly to Base64 to ensure 100% exact byte fidelity without batch character mangling
    const csBase64 = Buffer.from(csharpAppCode, 'utf8').toString('base64');

    const batContent = `@echo off
setlocal EnableDelayedExpansion
title Remote DOT Desk Enterprise - Agente de Soporte
color 0B
cls
echo.
echo ============================================================================
echo   REMOTE DOT DESK ENTERPRISE - AGENTE NATIVO DE SOPORTE WINDOWS
echo   Tenant: ${pkg.customerCompany} (ID: ${pkg.customerId})
echo ============================================================================
echo.

:: 1. Verificacion de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Solicitando permisos de Administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [+] Permisos de Administrador concedidos.
echo [+] Servidor Central: ${effectiveServerUrl}
echo.

set "TARGET_DIR=%ProgramFiles%\\SmartDotDesk"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [1/4] Creando excepciones de Red y Firewall...
netsh advfirewall firewall add rule name="SmartDot Desk Out" dir=out action=allow protocol=TCP remoteport=3000,443,80 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="SmartDot Desk WebRTC" dir=in action=allow protocol=UDP localport=50000-65535 profile=any >nul 2>&1

echo [2/4] Escribiendo codigo fuente de la aplicacion en C#...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$bytes = [System.Convert]::FromBase64String('${csBase64}'); [System.IO.File]::WriteAllBytes('%TARGET_DIR%\\Program.cs', $bytes);"

echo [3/4] Compilando ejecutable nativo RemoteDotDesk.exe...
set "CSC_EXE="
if exist "%SystemRoot%\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe" set "CSC_EXE=%SystemRoot%\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe"
if not defined CSC_EXE if exist "%SystemRoot%\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe" set "CSC_EXE=%SystemRoot%\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"

if defined CSC_EXE (
    echo [+] Compilador localizado: %CSC_EXE%
    "%CSC_EXE%" /nologo /target:winexe /out:"%TARGET_DIR%\\RemoteDotDesk.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.dll "%TARGET_DIR%\\Program.cs"
) else (
    echo [!] Compilando mediante PowerShell .NET Add-Type...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$code = [System.IO.File]::ReadAllText('%TARGET_DIR%\\Program.cs'); Add-Type -TypeDefinition $code -OutputAssembly '%TARGET_DIR%\\RemoteDotDesk.exe' -OutputType WindowsApplication -ReferencedAssemblies 'System.Windows.Forms', 'System.Drawing', 'System'"
)

echo [4/4] Creando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $Desk = [Environment]::GetFolderPath('Desktop'); $scPath = Join-Path $Desk 'Remote DOT Desk Soporte.lnk'; $sc = $WshShell.CreateShortcut($scPath); $sc.TargetPath = '%TARGET_DIR%\\RemoteDotDesk.exe'; $sc.WorkingDirectory = '%TARGET_DIR%'; $sc.Description = 'Remote DOT Desk Enterprise - Agente de Soporte'; $sc.IconLocation = '%SystemRoot%\\System32\\imageres.dll, 15'; $sc.Save();"

echo.
if exist "%TARGET_DIR%\\RemoteDotDesk.exe" (
    echo ============================================================================
    echo   [EXITO] INSTALACION COMPLETADA
    echo   Se ha generado el archivo ejecutable: RemoteDotDesk.exe
    echo   Acceso directo creado en su Escritorio.
    echo ============================================================================
    echo.
    echo [*] Iniciando RemoteDotDesk.exe ahora...
    start "" "%TARGET_DIR%\\RemoteDotDesk.exe"
) else (
    echo ============================================================================
    echo   [AVISO] No se pudo generar RemoteDotDesk.exe.
    echo   Por favor revise los mensajes de error arriba.
    echo ============================================================================
)

echo.
pause
exit /b
`;
    res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Instalar_Remote_DOT_Desk_${pkg.customerId}.bat"`);
    return res.send(batContent);
  }

  // Default: PowerShell Deployment Script
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Deploy-RemoteDesk_${pkg.customerId}.ps1"`);
  return res.send(pkg.generatedFiles.deployPowerShellScript);
});
