import { config } from '../config/env.js';
import { routerService } from './router.service.js';
import { pocketbaseService } from './pocketbase.service.js';
import { MonitorStatus, ScrapedDevice } from '../types/index.js';

interface ActiveDeviceSession {
  device: ScrapedDevice;
  connectedAt: number;
  lastSeenAt: number;
  missedPolls: number;
}

export class MonitorService {
  private activeDevices: Map<string, ActiveDeviceSession> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPollAt: string | null = null;
  private routerReachable = false;
  private isFirstRun = true;

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
      for (const d of knownDevices) {
        if (d.is_online) {
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
            connectedAt: isNaN(connectedTime) ? Date.now() : connectedTime,
            lastSeenAt: isNaN(lastSeenTime) ? Date.now() : lastSeenTime,
            missedPolls: 0
          });
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
        const existingSession = this.activeDevices.get(dev.mac);

        if (!existingSession) {
          this.activeDevices.set(dev.mac, {
            device: dev,
            connectedAt: nowTime,
            lastSeenAt: nowTime,
            missedPolls: 0
          });

          await pocketbaseService.upsertDevice({
            mac: dev.mac,
            name: dev.name,
            ip: dev.ip,
            connection_type: dev.connection_type,
            is_online: true,
            last_connected_at: isoNow,
            last_seen_at: isoNow
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
        } else {
          existingSession.device = dev;
          existingSession.lastSeenAt = nowTime;
          existingSession.missedPolls = 0;

          await pocketbaseService.upsertDevice({
            mac: dev.mac,
            name: dev.name,
            ip: dev.ip,
            connection_type: dev.connection_type,
            is_online: true,
            last_seen_at: isoNow
          });
        }
      }

      const graceLimit = Math.max(1, config.disconnectGracePolls);

      for (const [mac, session] of this.activeDevices.entries()) {
        if (!currentMacs.has(mac)) {
          session.missedPolls += 1;

          if (session.missedPolls >= graceLimit) {
            const lastSeenIso = new Date(session.lastSeenAt).toISOString();
            const duration = Math.max(0, Math.round((session.lastSeenAt - session.connectedAt) / 1000));

            await pocketbaseService.upsertDevice({
              mac,
              name: session.device.name,
              ip: session.device.ip,
              connection_type: session.device.connection_type,
              is_online: false,
              last_disconnected_at: lastSeenIso,
              last_seen_at: lastSeenIso
            });

            if (!this.isFirstRun) {
              await pocketbaseService.recordLog({
                mac,
                name: session.device.name,
                ip: session.device.ip,
                connection_type: session.device.connection_type,
                event_type: 'disconnected',
                timestamp: lastSeenIso,
                session_duration: duration
              });
            }

            this.activeDevices.delete(mac);
          }
        }
      }

      this.isFirstRun = false;
    } catch {
      this.routerReachable = false;
    }
  }

  async getStatus(): Promise<MonitorStatus> {
    let total = 0;
    try {
      const all = await pocketbaseService.getAllDevices();
      total = all.length;
    } catch {
      total = this.activeDevices.size;
    }

    return {
      isRunning: this.isRunning,
      lastPollAt: this.lastPollAt,
      onlineCount: this.activeDevices.size,
      totalDevices: total,
      pollIntervalMs: config.pollIntervalMs,
      routerReachable: this.routerReachable
    };
  }
}

export const monitorService = new MonitorService();
