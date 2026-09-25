import { Request, Response } from 'express';
import { monitorService } from '../services/monitor.service.js';
import { pocketbaseService } from '../services/pocketbase.service.js';

export class TrackerController {
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await monitorService.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await pocketbaseService.getAllDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateAlias(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { alias } = req.body;
      const updated = await pocketbaseService.updateDeviceAlias(id, alias || '');
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateBlocked(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { is_blocked } = req.body;
      const updated = await pocketbaseService.updateDeviceBlocked(id, !!is_blocked);
      if (updated?.mac) {
        monitorService.setDeviceBlocked(updated.mac, !!is_blocked);
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const perPage = parseInt(req.query.perPage as string || '50', 10);
      const mac = req.query.mac as string | undefined;
      const logs = await pocketbaseService.getLogs(page, perPage, mac);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      await monitorService.poll();
      const status = await monitorService.getStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const trackerController = new TrackerController();
