export interface ScrapedDevice {
  mac: string;
  name: string;
  ip: string;
  connection_type: string;
  comments: string;
}

export interface DeviceRecord {
  id: string;
  mac: string;
  name: string;
  custom_alias?: string;
  ip: string;
  connection_type: string;
  is_online: boolean;
  last_connected_at?: string;
  last_disconnected_at?: string;
  last_seen_at?: string;
  created?: string;
  updated?: string;
}

export interface NetworkLogRecord {
  id: string;
  mac: string;
  name: string;
  ip: string;
  connection_type: string;
  event_type: 'connected' | 'disconnected';
  timestamp: string;
  session_duration?: number;
  created?: string;
  updated?: string;
}

export interface MonitorStatus {
  isRunning: boolean;
  lastPollAt: string | null;
  onlineCount: number;
  totalDevices: number;
  pollIntervalMs: number;
  routerReachable: boolean;
}
