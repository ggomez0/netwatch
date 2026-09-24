import PocketBase from 'pocketbase';
import { config } from '../config/env.js';
import { DeviceRecord, NetworkLogRecord } from '../types/index.js';

export class PocketBaseService {
  private client: PocketBase;

  constructor() {
    this.client = new PocketBase(config.pocketbaseUrl);
    this.client.autoCancellation(false);
  }

  async getAllDevices(): Promise<DeviceRecord[]> {
    const records = await this.client.collection('network_devices').getFullList<DeviceRecord>({
      sort: '-is_online,-last_seen_at'
    });
    return records;
  }

  async getDeviceByMac(mac: string): Promise<DeviceRecord | null> {
    try {
      const record = await this.client.collection('network_devices').getFirstListItem<DeviceRecord>(
        `mac="${mac}"`
      );
      return record;
    } catch {
      return null;
    }
  }

  async updateDevice(id: string, payload: any): Promise<DeviceRecord> {
    return await this.client.collection('network_devices').update<DeviceRecord>(id, payload);
  }

  async createDevice(payload: any): Promise<DeviceRecord> {
    return await this.client.collection('network_devices').create<DeviceRecord>(payload);
  }

  async upsertDevice(data: {
    mac: string;
    name: string;
    ip?: string;
    connection_type?: string;
    is_online: boolean;
    last_connected_at?: string;
    last_disconnected_at?: string;
    last_seen_at?: string;
  }): Promise<DeviceRecord> {
    const existing = await this.getDeviceByMac(data.mac);
    const payload: any = {
      mac: data.mac,
      name: data.name,
      is_online: data.is_online,
      last_seen_at: data.last_seen_at || new Date().toISOString()
    };

    if (data.ip) payload.ip = data.ip;
    if (data.connection_type) payload.connection_type = data.connection_type;
    if (data.last_connected_at) payload.last_connected_at = data.last_connected_at;
    if (data.last_disconnected_at) payload.last_disconnected_at = data.last_disconnected_at;

    if (existing) {
      return await this.client.collection('network_devices').update<DeviceRecord>(existing.id, payload);
    } else {
      return await this.client.collection('network_devices').create<DeviceRecord>(payload);
    }
  }

  async updateDeviceAlias(id: string, alias: string): Promise<DeviceRecord> {
    return await this.client.collection('network_devices').update<DeviceRecord>(id, {
      custom_alias: alias
    });
  }

  async recordLog(data: {
    mac: string;
    name: string;
    ip?: string;
    connection_type?: string;
    event_type: 'connected' | 'disconnected';
    timestamp: string;
    session_duration?: number;
  }): Promise<NetworkLogRecord> {
    return await this.client.collection('network_logs').create<NetworkLogRecord>({
      mac: data.mac,
      name: data.name,
      ip: data.ip || '',
      connection_type: data.connection_type || '',
      event_type: data.event_type,
      timestamp: data.timestamp,
      session_duration: data.session_duration || 0
    });
  }

  async getLogs(page = 1, perPage = 50, mac?: string): Promise<{ items: NetworkLogRecord[]; totalItems: number; totalPages: number }> {
    const options: any = {
      sort: '-created'
    };
    if (mac) {
      options.filter = `mac="${mac}"`;
    }
    const result = await this.client.collection('network_logs').getList<NetworkLogRecord>(page, perPage, options);
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    };
  }

  async deleteLog(id: string): Promise<boolean> {
    try {
      return await this.client.collection('network_logs').delete(id);
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.client.health.check();
      return res.code === 200;
    } catch {
      return false;
    }
  }
}

export const pocketbaseService = new PocketBaseService();
