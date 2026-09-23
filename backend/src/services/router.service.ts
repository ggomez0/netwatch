import * as cheerio from 'cheerio';
import { config } from '../config/env.js';
import { ScrapedDevice } from '../types/index.js';

export class RouterService {
  private cachedIps: Map<string, { ip: string; comments: string }> = new Map();
  private lastDetailFetch: number = 0;

  async getOnlineDevices(): Promise<ScrapedDevice[]> {
    const response = await fetch(`${config.routerUrl}/index.php`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Router response status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const devices: ScrapedDevice[] = [];

    $('#internet-usage table.data tr').each((_, elem) => {
      const name = $(elem).find("td[headers='host-name']").text().trim();
      const mac = $(elem).find("td[headers='mac-address']").text().trim().toUpperCase();
      const conn = $(elem).find("td[headers='connection-type']").text().trim();

      if (mac && mac.includes(':')) {
        const cached = this.cachedIps.get(mac);
        devices.push({
          mac,
          name: name || 'Dispositivo sin nombre',
          connection_type: conn || 'Desconocido',
          ip: cached?.ip || '',
          comments: cached?.comments || ''
        });
      }
    });

    const now = Date.now();
    if (now - this.lastDetailFetch > 300000) {
      this.refreshDeviceDetails().catch(() => {});
    }

    return devices;
  }

  async refreshDeviceDetails(): Promise<void> {
    try {
      this.lastDetailFetch = Date.now();
      const b64Pass = Buffer.from(config.routerPass, 'utf-8').toString('base64');
      const params = new URLSearchParams();
      params.append('username', config.routerUser);
      params.append('password', b64Pass);

      const loginRes = await fetch(`${config.routerUrl}/check.php`, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(10000)
      });

      const setCookie = loginRes.headers.get('set-cookie');
      if (!setCookie) return;

      const cookieMatch = setCookie.match(/PHPSESSID=([^;]+)/);
      if (!cookieMatch) return;

      const cookie = `PHPSESSID=${cookieMatch[1]}`;

      const devicesRes = await fetch(`${config.routerUrl}/connected_devices_computers.php`, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: AbortSignal.timeout(10000)
      });

      const devicesHtml = await devicesRes.text();
      const $ = cheerio.load(devicesHtml);

      $('table.data tr').each((_, elem) => {
        const rowText = $(elem).text();
        const macMatch = rowText.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
        const ipMatch = rowText.match(/192\.168\.\d+\.\d+/);
        if (macMatch) {
          const mac = macMatch[0].toUpperCase();
          const ip = ipMatch ? ipMatch[0] : '';
          const commentsMatch = rowText.match(/Comments\s*([^\n\r<]+)/i);
          const comments = commentsMatch ? commentsMatch[1].trim() : '';
          this.cachedIps.set(mac, { ip, comments });
        }
      });

      await fetch(`${config.routerUrl}/home_loggedout.php`, {
        headers: { 'Cookie': cookie },
        signal: AbortSignal.timeout(5000)
      }).catch(() => {});
    } catch {
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${config.routerUrl}/index.php`, {
        signal: AbortSignal.timeout(6000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const routerService = new RouterService();
