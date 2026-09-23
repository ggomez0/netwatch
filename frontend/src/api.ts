import { DeviceRecord, MonitorStatus, NetworkLogRecord } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchStatus(): Promise<MonitorStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Error al obtener estado');
  return res.json();
}

export async function fetchDevices(): Promise<DeviceRecord[]> {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error('Error al obtener dispositivos');
  return res.json();
}

export async function fetchLogs(page = 1, perPage = 50): Promise<{ items: NetworkLogRecord[]; totalItems: number; totalPages: number }> {
  const res = await fetch(`${API_BASE}/logs?page=${page}&perPage=${perPage}`);
  if (!res.ok) throw new Error('Error al obtener historial');
  return res.json();
}

export async function fetchDeviceLogs(mac: string, page = 1, perPage = 50): Promise<{ items: NetworkLogRecord[]; totalItems: number; totalPages: number }> {
  const res = await fetch(`${API_BASE}/logs?mac=${encodeURIComponent(mac)}&page=${page}&perPage=${perPage}`);
  if (!res.ok) throw new Error('Error al obtener historial del dispositivo');
  return res.json();
}

export async function updateDeviceAlias(id: string, alias: string): Promise<DeviceRecord> {
  const res = await fetch(`${API_BASE}/devices/${id}/alias`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias })
  });
  if (!res.ok) throw new Error('Error al actualizar alias');
  return res.json();
}

export async function triggerManualSync(): Promise<{ success: boolean; status: MonitorStatus }> {
  const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Error al forzar sincronización');
  return res.json();
}
