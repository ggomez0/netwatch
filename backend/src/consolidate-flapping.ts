import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';

dotenv.config();

const pb = new PocketBase(process.env.POCKETBASE_URL);
pb.autoCancellation(false);

const MAX_GAP_MS = 300 * 1000;

async function consolidate() {
  const devices = await pb.collection('network_devices').getFullList();

  for (const dev of devices) {
    const logs = await pb.collection('network_logs').getFullList({
      filter: `mac="${dev.mac}"`,
      sort: 'timestamp'
    });

    if (logs.length < 2) continue;

    const toDeleteIds: string[] = [];
    let i = 0;

    while (i < logs.length - 1) {
      const current = logs[i];
      const next = logs[i + 1];

      if (current.event_type === 'disconnected' && next.event_type === 'connected') {
        const gap = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
        if (gap >= 0 && gap <= MAX_GAP_MS) {
          toDeleteIds.push(current.id);
          toDeleteIds.push(next.id);
          i += 2;
          continue;
        }
      }
      i++;
    }

    if (toDeleteIds.length > 0) {
      console.log(`Device ${dev.name || dev.mac} (${dev.mac}): deleting ${toDeleteIds.length} flapping log entries...`);
      for (const id of toDeleteIds) {
        await pb.collection('network_logs').delete(id);
      }

      const remainingLogs = await pb.collection('network_logs').getFullList({
        filter: `mac="${dev.mac}"`,
        sort: 'timestamp'
      });

      for (let j = 0; j < remainingLogs.length - 1; j++) {
        const c = remainingLogs[j];
        const n = remainingLogs[j + 1];
        if (c.event_type === 'connected' && n.event_type === 'disconnected') {
          const dur = Math.max(0, Math.round((new Date(n.timestamp).getTime() - new Date(c.timestamp).getTime()) / 1000));
          if (n.session_duration !== dur) {
            await pb.collection('network_logs').update(n.id, { session_duration: dur });
          }
        }
      }
    }
  }

  console.log('CONSOLIDATION_FINISHED');
}

consolidate().catch((err) => {
  console.error(err);
  process.exit(1);
});
