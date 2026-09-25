import assert from 'node:assert/strict';
import { routerService } from '../src/services/router.service.js';
import { pocketbaseService } from '../src/services/pocketbase.service.js';

async function runTests() {
  console.log('--- TEST 1: Router Connection & HTML Parsing ---');
  const isRouterAlive = await routerService.testConnection();
  assert.equal(isRouterAlive, true, 'Router must be reachable');
  const devices = await routerService.getOnlineDevices();
  assert.ok(Array.isArray(devices), 'Devices must be an array');
  assert.ok(devices.length > 0, 'At least one device should be connected on the router');
  const first = devices[0];
  assert.ok(first.mac.includes(':'), 'Device MAC must be valid');
  assert.ok(first.connection_type.length > 0, 'Device must have connection type');
  console.log(`PASSED: Detected ${devices.length} active devices from router.`);

  console.log('--- TEST 2: PocketBase Health Check ---');
  const isPbHealthy = await pocketbaseService.testConnection();
  assert.equal(isPbHealthy, true, 'PocketBase on VPS must be healthy');
  console.log('PASSED: PocketBase is reachable and healthy.');

  console.log('--- TEST 3: PocketBase Devices & Logs Operations ---');
  const testMac = 'AA:BB:CC:DD:EE:FF';
  const createdDevice = await pocketbaseService.upsertDevice({
    mac: testMac,
    name: 'DispositivoDePrueba',
    ip: '192.168.0.254',
    connection_type: 'Wi-Fi 5G',
    is_online: true,
    last_connected_at: new Date().toISOString()
  });
  assert.equal(createdDevice.mac, testMac);
  assert.equal(createdDevice.is_online, true);

  const updatedDevice = await pocketbaseService.updateDeviceAlias(createdDevice.id, 'Alias Test');
  assert.equal(updatedDevice.custom_alias, 'Alias Test');

  const blockedDevice = await pocketbaseService.updateDeviceBlocked(createdDevice.id, true);
  assert.equal(blockedDevice.is_blocked, true);

  const unblockedDevice = await pocketbaseService.updateDeviceBlocked(createdDevice.id, false);
  assert.equal(unblockedDevice.is_blocked, false);

  const logEntry = await pocketbaseService.recordLog({
    mac: testMac,
    name: 'DispositivoDePrueba',
    ip: '192.168.0.254',
    connection_type: 'Wi-Fi 5G',
    event_type: 'connected',
    timestamp: new Date().toISOString()
  });
  assert.equal(logEntry.mac, testMac);
  assert.equal(logEntry.event_type, 'connected');

  const disconnLog = await pocketbaseService.recordLog({
    mac: testMac,
    name: 'DispositivoDePrueba',
    ip: '192.168.0.254',
    connection_type: 'Wi-Fi 5G',
    event_type: 'disconnected',
    timestamp: new Date().toISOString(),
    session_duration: 120
  });
  assert.equal(disconnLog.event_type, 'disconnected');
  assert.equal(disconnLog.session_duration, 120);

  const logs = await pocketbaseService.getLogs(1, 10);
  assert.ok(logs.items.length > 0);
  console.log('PASSED: CRUD operations on PocketBase completed successfully.');

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
