import { config } from '../config/env.js';
import { routerService } from './router.service.js';
import { pocketbaseService } from './pocketbase.service.js';
import { MonitorStatus, ScrapedDevice } from '../types/index.js';

interface ActiveDeviceSession {
  device: ScrapedDevice;
  deviceId: string;
  connectedAt: number;
  lastSeenAt: number;
  lastSyncedAt: number;
  missedPolls: number;
}

export class MonitorService {
  private activeDevices: Map<string, ActiveDeviceSession> = new Map();
  private deviceIdMap: Map<string, string> = new Map();
  private totalDevicesCount = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPollAt: string | null = null;
  private routerReachable = false;
  private isFirstRun = true;
  private recentDisconnections: Map<string, { disconnectedAt: number; connectedAt: number; logId?: string }> = new Map();
  private blockedMacs: Set<string> = new Set();

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.initActiveDevices();
    await this.poll();
    this.intervalId = setInterval(() => {
      this.poll().catch(() => {});
    }, config.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async initActiveDevices(): Promise<void> {
    try {
      const knownDevices = await pocketbaseService.getAllDevices();
      this.totalDevicesCount = knownDevices.length;
      for (const d of knownDevices) {
        this.deviceIdMap.set(d.mac, d.id);
        if (d.is_blocked) {
          this.blockedMacs.add(d.mac);
        }
        if (d.is_online && !d.is_blocked) {
          const connectedTime = d.last_connected_at ? new Date(d.last_connected_at).getTime() : Date.now();
          const lastSeenTime = d.last_seen_at ? new Date(d.last_seen_at).getTime() : Date.now();
          this.activeDevices.set(d.mac, {
            device: {
              mac: d.mac,
              name: d.name,
              ip: d.ip,
              connection_type: d.connection_type,
              comments: ''
            },
            deviceId: d.id,
            connectedAt: isNaN(connectedTime) ? Date.now() : connectedTime,
            lastSeenAt: isNaN(lastSeenTime) ? Date.now() : lastSeenTime,
            lastSyncedAt: Date.now(),
            missedPolls: 0
          });
        } else {
          const discTime = d.last_disconnected_at ? new Date(d.last_disconnected_at).getTime() : 0;
          const connTime = d.last_connected_at ? new Date(d.last_connected_at).getTime() : discTime;
          if (discTime > 0 && (Date.now() - discTime) <= (15 * 60 * 1000)) {
            this.recentDisconnections.set(d.mac, {
              disconnectedAt: discTime,
              connectedAt: connTime
            });
          }
        }
      }
    } catch {
    }
  }

  async poll(): Promise<void> {
    try {
      const currentDevices = await routerService.getOnlineDevices();
      this.routerReachable = true;
      const nowTime = Date.now();
      const isoNow = new Date(nowTime).toISOString();
      this.lastPollAt = isoNow;
      const currentMacs = new Set<string>();

      for (const dev of currentDevices) {
        currentMacs.add(dev.mac);

        if (this.blockedMacs.has(dev.mac)) {
          const deviceId = this.deviceIdMap.get(dev.mac);
          if (deviceId) {
            await pocketbaseService.updateDevice(deviceId, {
              is_online: false,
              is_blocked: true,
              last_seen_at: isoNow,
              ip: dev.ip,
              connection_type: dev.connection_type,
              name: dev.name
            });
          }
          continue;
        }

        const existingSession = this.activeDevices.get(dev.mac);

        if (!existingSession) {
          let deviceId = this.deviceIdMap.get(dev.mac);
          const recentDisc = this.recentDisconnections.get(dev.mac);
          const isQuickReconnection = recentDisc && (nowTime - recentDisc.disconnectedAt) <= (15 * 60 * 1000);

          if (isQuickReconnection && recentDisc) {
            if (recentDisc.logId) {
              await pocketbaseService.deleteLog(recentDisc.logId);
            }
            this.recentDisconnections.delete(dev.mac);

            if (deviceId) {
              await pocketbaseService.updateDevice(deviceId, {
                is_online: true,
                last_seen_at: isoNow,
                ip: dev.ip,
                connection_type: dev.connection_type,
                name: dev.name
              });
            }

            this.activeDevices.set(dev.mac, {
              device: dev,
              deviceId: deviceId || '',
              connectedAt: recentDisc.connectedAt,
              lastSeenAt: nowTime,
              lastSyncedAt: nowTime,
              missedPolls: 0
            });
          } else {
            this.recentDisconnections.delete(dev.mac);
            if (deviceId) {
              await pocketbaseService.updateDevice(deviceId, {
                is_online: true,
                last_connected_at: isoNow,
                last_seen_at: isoNow,
                ip: dev.ip,
                connection_type: dev.connection_type,
                name: dev.name
              });
            } else {
              const created = await pocketbaseService.upsertDevice({
                mac: dev.mac,
                name: dev.name,
                ip: dev.ip,
                connection_type: dev.connection_type,
                is_online: true,
                last_connected_at: isoNow,
                last_seen_at: isoNow
              });
              deviceId = created.id;
              this.deviceIdMap.set(dev.mac, deviceId);
              this.totalDevicesCount += 1;
            }

            this.activeDevices.set(dev.mac, {
              device: dev,
              deviceId: deviceId || '',
              connectedAt: nowTime,
              lastSeenAt: nowTime,
              lastSyncedAt: nowTime,
              missedPolls: 0
            });

            if (!this.isFirstRun) {
              await pocketbaseService.recordLog({
                mac: dev.mac,
                name: dev.name,
                ip: dev.ip,
                connection_type: dev.connection_type,
                event_type: 'connected',
                timestamp: isoNow
              });
            }
          }
        } else {
          existingSession.lastSeenAt = nowTime;
          existingSession.missedPolls = 0;

          const ipChanged = dev.ip && dev.ip !== existingSession.device.ip;
          const nameChanged = dev.name && dev.name !== existingSession.device.name && dev.name !== 'Dispositivo sin nombre';
          const typeChanged = dev.connection_type && dev.connection_type !== existingSession.device.connection_type;
          const periodicHeartbeat = (nowTime - existingSession.lastSyncedAt) > 15 * 60 * 1000;

          if (ipChanged || nameChanged || typeChanged || periodicHeartbeat) {
            existingSession.device = dev;
            existingSession.lastSyncedAt = nowTime;
            if (existingSession.deviceId) {
              await pocketbaseService.updateDevice(existingSession.deviceId, {
                name: dev.name,
                ip: dev.ip,
                connection_type: dev.connection_type,
                last_seen_at: isoNow
              });
            }
          }
        }
      }

      const graceLimit = Math.max(1, config.disconnectGracePolls);

      for (const [mac, session] of this.activeDevices.entries()) {
        if (!currentMacs.has(mac)) {
          session.missedPolls += 1;

          if (session.missedPolls >= graceLimit) {
            const pollSec = Math.max(1, Math.round(config.pollIntervalMs / 1000));
            const effectiveDisconnectTime = session.lastSeenAt === session.connectedAt
              ? session.lastSeenAt + (pollSec * 1000)
              : session.lastSeenAt;
            const lastSeenIso = new Date(effectiveDisconnectTime).toISOString();
            const duration = Math.max(pollSec, Math.round((effectiveDisconnectTime - session.connectedAt) / 1000));

            if (session.deviceId) {
              await pocketbaseService.updateDevice(session.deviceId, {
                is_online: false,
                last_disconnected_at: lastSeenIso,
                last_seen_at: lastSeenIso
              });
            }

            let discLogId: string | undefined;
            if (!this.isFirstRun) {
              const rec = await pocketbaseService.recordLog({
                mac,
                name: session.device.name,
                ip: session.device.ip,
                connection_type: session.device.connection_type,
                event_type: 'disconnected',
                timestamp: lastSeenIso,
                session_duration: duration
              });
              discLogId = rec?.id;
            }

            this.recentDisconnections.set(mac, {
              disconnectedAt: effectiveDisconnectTime,
              connectedAt: session.connectedAt,
              logId: discLogId
            });

            this.activeDevices.delete(mac);
          }
        }
      }

      this.isFirstRun = false;
    } catch {
      this.routerReachable = false;
    }
  }

  setDeviceBlocked(mac: string, isBlocked: boolean): void {
    if (isBlocked) {
      this.blockedMacs.add(mac);
      this.activeDevices.delete(mac);
      this.recentDisconnections.delete(mac);
    } else {
      this.blockedMacs.delete(mac);
    }
  }

  isDeviceBlocked(mac: string): boolean {
    return this.blockedMacs.has(mac);
  }

  async getStatus(): Promise<MonitorStatus> {
    let unblockedOnlineCount = 0;
    for (const mac of this.activeDevices.keys()) {
      if (!this.blockedMacs.has(mac)) {
        unblockedOnlineCount++;
      }
    }
    return {
      isRunning: this.isRunning,
      lastPollAt: this.lastPollAt,
      onlineCount: unblockedOnlineCount,
      totalDevices: this.totalDevicesCount || this.activeDevices.size,
      pollIntervalMs: config.pollIntervalMs,
      routerReachable: this.routerReachable
    };
  }
}

export const monitorService = new MonitorService();
