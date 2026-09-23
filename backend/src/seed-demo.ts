import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';

dotenv.config();

const pb = new PocketBase(process.env.POCKETBASE_URL);
pb.autoCancellation(false);

const MAC = 'AA:BB:CC:DD:EE:FF';
const NAME = 'Dispositivo-Demo';
const IP = '192.168.1.50';
const TYPE = 'Wi-Fi 2.4GHz';

function createDateIso(year: number, month: number, day: number, hour: number, minute = 0, second = 0): string {
  const d = new Date(year, month - 1, day, hour, minute, second);
  return d.toISOString();
}

const sessions = [
  {
    connectedAt: createDateIso(2026, 9, 21, 8, 0, 0),
    disconnectedAt: createDateIso(2026, 9, 21, 12, 0, 0),
    duration: 4 * 3600,
  },
  {
    connectedAt: createDateIso(2026, 9, 22, 8, 0, 0),
    disconnectedAt: createDateIso(2026, 9, 22, 12, 0, 0),
    duration: 4 * 3600,
  },
];

async function seed() {
  let deviceId: string;

  const existing = await pb.collection('network_devices').getList(1, 1, { filter: `mac="${MAC}"` });
  if (existing.items.length > 0) {
    deviceId = existing.items[0].id;
    await pb.collection('network_devices').update(deviceId, {
      name: NAME,
      custom_alias: 'Dispositivo Demo (21 y 22 Sept)',
      ip: IP,
      connection_type: TYPE,
      is_online: false,
      last_connected_at: sessions[1].connectedAt,
      last_disconnected_at: sessions[1].disconnectedAt,
      last_seen_at: sessions[1].disconnectedAt,
    });
  } else {
    const device = await pb.collection('network_devices').create({
      mac: MAC,
      name: NAME,
      custom_alias: 'Dispositivo Demo (21 y 22 Sept)',
      ip: IP,
      connection_type: TYPE,
      is_online: false,
      last_connected_at: sessions[1].connectedAt,
      last_disconnected_at: sessions[1].disconnectedAt,
      last_seen_at: sessions[1].disconnectedAt,
    });
    deviceId = device.id;
  }

  const allLogs = await pb.collection('network_logs').getFullList({ filter: `mac="${MAC}"` });
  for (const log of allLogs) {
    await pb.collection('network_logs').delete(log.id);
  }

  for (const session of sessions) {
    await pb.collection('network_logs').create({
      mac: MAC,
      name: NAME,
      ip: IP,
      connection_type: TYPE,
      event_type: 'connected',
      timestamp: session.connectedAt,
      session_duration: null,
    });

    await pb.collection('network_logs').create({
      mac: MAC,
      name: NAME,
      ip: IP,
      connection_type: TYPE,
      event_type: 'disconnected',
      timestamp: session.disconnectedAt,
      session_duration: session.duration,
    });
  }

  console.log('SEED_SUCCESS_EXACT_DATES');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
