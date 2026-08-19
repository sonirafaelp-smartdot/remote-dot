import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.ts';
import { realtimeHub } from '../realtime.ts';
import {
  FileTransferTask,
  FileTransferAuditRecord,
  RemoteFileItem,
} from '../database/entities.ts';

export const filesRouter = Router();

// 1. Enumerate available drives on remote machine
filesRouter.get('/drives', (req: Request, res: Response) => {
  const deviceId = (req.query.deviceId as string) || 'dev-001';
  const drives = db.getDrives(deviceId);
  res.json({
    success: true,
    deviceId,
    drives,
  });
});

// 2. Browse directory contents on remote machine
filesRouter.get('/browse', (req: Request, res: Response) => {
  const deviceId = (req.query.deviceId as string) || 'dev-001';
  const targetPath = (req.query.path as string) || 'C:\\';

  try {
    const result = db.browseDirectory(deviceId, targetPath);
    res.json({
      success: true,
      deviceId,
      path: result.path,
      parentPath: result.parentPath,
      drive: result.drive,
      items: result.items,
      totalCount: result.items.length,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error explorando directorio remoto: ${err.message}`,
    });
  }
});

// 3. Create new directory on remote device
filesRouter.post('/mkdir', (req: Request, res: Response) => {
  const { deviceId, parentPath, folderName, technicianId, sessionId } = req.body;

  if (!deviceId || !parentPath || !folderName) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros requeridos (deviceId, parentPath, folderName).',
    });
  }

  try {
    const newFolder = db.createDirectory(deviceId, parentPath, folderName);
    
    // Audit
    db.logAudit(
      technicianId,
      'REMOTE_DIRECTORY_CREATED',
      'DeviceFileSystem',
      deviceId,
      {
        path: newFolder.path,
        parentPath,
        sessionId,
      }
    );

    res.json({
      success: true,
      message: `Carpeta "${folderName}" creada exitosamente.`,
      folder: newFolder,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error al crear carpeta: ${err.message}`,
    });
  }
});

// 4. Delete file or directory on remote device
filesRouter.post('/delete', (req: Request, res: Response) => {
  const { deviceId, targetPath, technicianId, sessionId } = req.body;

  if (!deviceId || !targetPath) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros requeridos (deviceId, targetPath).',
    });
  }

  try {
    const success = db.deleteFileOrDirectory(deviceId, targetPath);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'El archivo o directorio no fue encontrado en el endpoint remoto.',
      });
    }

    // Audit
    db.logAudit(
      technicianId,
      'REMOTE_FILE_DELETED',
      'DeviceFileSystem',
      deviceId,
      {
        path: targetPath,
        sessionId,
      }
    );

    res.json({
      success: true,
      message: `Elemento "${targetPath}" eliminado con éxito.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error al eliminar elemento: ${err.message}`,
    });
  }
});

// 5. Rename file or directory on remote device
filesRouter.post('/rename', (req: Request, res: Response) => {
  const { deviceId, oldPath, newName, technicianId, sessionId } = req.body;

  if (!deviceId || !oldPath || !newName) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros requeridos (deviceId, oldPath, newName).',
    });
  }

  try {
    const updated = db.renameFileOrDirectory(deviceId, oldPath, newName);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el elemento a renombrar.',
      });
    }

    db.logAudit(
      technicianId,
      'REMOTE_FILE_RENAMED',
      'DeviceFileSystem',
      deviceId,
      {
        oldPath,
        newPath: updated.path,
        newName,
        sessionId,
      }
    );

    res.json({
      success: true,
      message: `Elemento renombrado a "${newName}".`,
      item: updated,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error al renombrar: ${err.message}`,
    });
  }
});

// 6. Initialize a Chunked File Transfer Task
filesRouter.post('/transfer/init', (req: Request, res: Response) => {
  const {
    sessionId,
    ticketId,
    deviceId,
    technicianId,
    fileName,
    fileSizeBytes,
    sourcePath,
    destinationPath,
    direction,
    sha256Expected,
    chunkSizeBytes,
  } = req.body;

  if (!deviceId || !fileName || !fileSizeBytes) {
    return res.status(400).json({
      success: false,
      message: 'Datos insuficientes para inicializar la transferencia de archivos.',
    });
  }

  // Pre-generate expected SHA-256 if not provided
  const expectedHash =
    sha256Expected ||
    crypto
      .createHash('sha256')
      .update(`${fileName}-${fileSizeBytes}-${Date.now()}`)
      .digest('hex');

  const task = db.initFileTransfer({
    sessionId: sessionId || 'sess-active-001',
    ticketId,
    deviceId,
    technicianId: technicianId || 'tech-001',
    fileName,
    fileSizeBytes: Number(fileSizeBytes),
    sourcePath: sourcePath || fileName,
    destinationPath: destinationPath || 'C:\\Windows\\Temp',
    direction: direction || 'UPLOAD',
    sha256Expected: expectedHash,
    chunkSizeBytes: Number(chunkSizeBytes) || 65536, // 64 KB
  });

  // Notify via WebSocket
  realtimeHub.broadcast({
    type: 'FILE_TRANSFER_STARTED',
    topic: 'system',
    severity: 'info',
    title: `Transferencia iniciada: ${fileName}`,
    message: `${task.direction === 'UPLOAD' ? 'Subiendo' : 'Descargando'} ${fileName} (${(task.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)...`,
    data: {
      taskId: task.id,
      fileName: task.fileName,
      direction: task.direction,
      totalChunks: task.totalChunks,
    },
  });

  res.json({
    success: true,
    message: 'Sesión de transferencia de archivos por bloques inicializada.',
    task,
  });
});

// 7. Receive & Process Chunk
filesRouter.post('/transfer/:id/chunk', (req: Request, res: Response) => {
  const { id } = req.params;
  const { chunkIndex, chunkBytes, speedKbps } = req.body;

  const task = db.fileTransfers.get(id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Transferencia no encontrada o expirada.',
    });
  }

  if (task.status === 'CANCELLED' || task.status === 'PAUSED') {
    return res.json({
      success: true,
      task,
      message: `La transferencia está en estado ${task.status}.`,
    });
  }

  const bytes = Number(chunkBytes) || task.chunkSizeBytes;
  task.currentChunk = Number(chunkIndex);
  task.bytesTransferred = Math.min(task.fileSizeBytes, task.bytesTransferred + bytes);
  task.progressPct = Math.min(100, Math.round((task.bytesTransferred / task.fileSizeBytes) * 100));
  task.speedKbps = Number(speedKbps) || Math.floor(18000 + Math.random() * 12000); // 18-30 MB/s

  res.json({
    success: true,
    task,
  });
});

// 8. Finalize & Verify SHA-256 + Security Scan (AMSI)
filesRouter.post('/transfer/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { sha256Client } = req.body;

  const task = db.fileTransfers.get(id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Transferencia no encontrada.',
    });
  }

  // Calculate or assign verified hash
  task.sha256Calculated = sha256Client || task.sha256Expected;
  task.sha256Verified = task.sha256Calculated.toLowerCase() === task.sha256Expected.toLowerCase();
  task.progressPct = 100;
  task.bytesTransferred = task.fileSizeBytes;
  task.status = task.sha256Verified ? 'COMPLETED' : 'FAILED';
  task.completedAt = new Date().toISOString();

  // Simulated Antivirus / AMSI Scan heuristic
  const isHighRiskExt = /\.(vbs|scr|bat|pif)$/i.test(task.fileName);
  if (isHighRiskExt) {
    task.securityScanResult = 'SUSPICIOUS';
    task.securityScanDetails = 'Win32 AMSI: Script ejecutable con potencial riesgo detectado. Requiere autorización.';
  } else {
    task.securityScanResult = 'CLEAN';
    task.securityScanDetails = 'Windows Defender AMSI: Archivo analizado y verificado sin amenazas (0 detecciones).';
  }

  // If UPLOAD succeeded, add the file to the virtual file system of the device!
  if (task.status === 'COMPLETED' && task.direction === 'UPLOAD') {
    const destDir = task.destinationPath.endsWith('\\') ? task.destinationPath : task.destinationPath + '\\';
    const filePath = destDir + task.fileName;
    const extMatch = task.fileName.match(/\.[^.]+$/);
    const files = db.deviceFiles.get(task.deviceId) || [];

    // Check if already exists, replace or add
    const existingIndex = files.findIndex((f) => f.path.toLowerCase() === filePath.toLowerCase());
    const fileItem: RemoteFileItem = {
      name: task.fileName,
      path: filePath,
      isDirectory: false,
      sizeBytes: task.fileSizeBytes,
      extension: extMatch ? extMatch[0] : '',
      modifiedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      attributes: { isReadOnly: false, isHidden: false, isSystem: false },
      permissions: { canRead: true, canWrite: true, canDelete: true },
    };

    if (existingIndex >= 0) {
      files[existingIndex] = fileItem;
    } else {
      files.push(fileItem);
    }
    db.deviceFiles.set(task.deviceId, files);
  }

  // Record Audit Entry
  const device = db.devices.get(task.deviceId);
  const tech = db.technicians.get(task.technicianId);
  const user = tech ? db.users.get(tech.user_id) : undefined;
  const customer = device ? db.customers.get(device.customer_id) : undefined;

  const durationSec = Math.max(
    0.5,
    (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000
  );

  const auditEntry = db.logFileAudit({
    sessionId: task.sessionId,
    ticketId: task.ticketId || 't-1001',
    technicianName: user?.full_name || 'Técnico Especialista',
    customerCompany: customer?.company_name || 'Cliente Corporativo',
    deviceComputerName: device?.computer_name || 'ENDPOINT-CLIENTE',
    fileName: task.fileName,
    sourcePath: task.sourcePath,
    destPath: task.destinationPath,
    direction: task.direction,
    fileSizeBytes: task.fileSizeBytes,
    sha256Checksum: task.sha256Calculated,
    durationSeconds: parseFloat(durationSec.toFixed(2)),
    avgSpeedKbps: task.speedKbps || 24000,
    status: task.sha256Verified ? 'SUCCESS' : 'CORRUPTED_HASH',
    clientApproved: true,
  });

  // Realtime Broadcast
  realtimeHub.broadcast({
    type: 'FILE_TRANSFER_COMPLETED',
    topic: 'system',
    severity: task.sha256Verified ? 'success' : 'error',
    title: task.sha256Verified
      ? `Transferencia completada: ${task.fileName}`
      : `Error de integridad: ${task.fileName}`,
    message: task.sha256Verified
      ? `Archivo transferido con éxito. SHA-256 verificado (${task.sha256Calculated.substring(0, 12)}...).`
      : 'El hash SHA-256 calculado no coincide con el origen.',
    data: {
      taskId: task.id,
      fileName: task.fileName,
      sha256: task.sha256Calculated,
      status: task.status,
    },
  });

  res.json({
    success: task.sha256Verified,
    message: task.sha256Verified
      ? 'Transferencia verificada e integrada exitosamente.'
      : 'Fallo de verificación de integridad por hash.',
    task,
    auditEntry,
  });
});

// 9. Transfer Flow Control (Pause, Resume, Cancel)
filesRouter.post('/transfer/:id/control', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;

  const task = db.fileTransfers.get(id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Transferencia no encontrada.',
    });
  }

  if (action === 'PAUSE') {
    task.status = 'PAUSED';
  } else if (action === 'RESUME') {
    task.status = 'TRANSFERRING';
  } else if (action === 'CANCEL') {
    task.status = 'CANCELLED';
    task.errorMessage = 'Cancelado por el operador técnico.';
  }

  res.json({
    success: true,
    task,
  });
});

// 10. List Active / Recent Transfers
filesRouter.get('/transfers', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const deviceId = req.query.deviceId as string;

  let list = Array.from(db.fileTransfers.values());

  if (sessionId) {
    list = list.filter((t) => t.sessionId === sessionId);
  }
  if (deviceId) {
    list = list.filter((t) => t.deviceId === deviceId);
  }

  res.json({
    success: true,
    transfers: list,
  });
});

// 11. File Transfer Audit Trail
filesRouter.get('/audit', (req: Request, res: Response) => {
  const { deviceId, ticketId, direction, search } = req.query;

  let logs = [...db.fileAuditLogs];

  if (deviceId) {
    logs = logs.filter((l) => l.deviceComputerName.toLowerCase().includes((deviceId as string).toLowerCase()));
  }
  if (ticketId) {
    logs = logs.filter((l) => l.ticketId === ticketId);
  }
  if (direction) {
    logs = logs.filter((l) => l.direction === direction);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.fileName.toLowerCase().includes(q) ||
        l.technicianName.toLowerCase().includes(q) ||
        l.sha256Checksum.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    totalCount: logs.length,
    auditLogs: logs,
  });
});

// 12. On-Demand SHA-256 Hash Computation for Remote File
filesRouter.post('/hash', (req: Request, res: Response) => {
  const { deviceId, filePath } = req.body;

  if (!deviceId || !filePath) {
    return res.status(400).json({
      success: false,
      message: 'Faltan parámetros (deviceId, filePath).',
    });
  }

  const files = db.deviceFiles.get(deviceId) || [];
  const file = files.find((f) => f.path.toLowerCase() === filePath.toLowerCase());

  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'Archivo no encontrado en el endpoint remoto.',
    });
  }

  const computedHash = crypto
    .createHash('sha256')
    .update(`${file.path}-${file.sizeBytes}-${file.modifiedDate}`)
    .digest('hex');

  res.json({
    success: true,
    path: file.path,
    sizeBytes: file.sizeBytes,
    algorithm: 'SHA-256',
    checksum: computedHash,
    verificationStatus: 'VERIFIED_OK',
    computedAt: new Date().toISOString(),
  });
});
