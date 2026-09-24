import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  routerUrl: process.env.ROUTER_URL || '',
  routerUser: process.env.ROUTER_USER || '',
  routerPass: process.env.ROUTER_PASS || '',
  pocketbaseUrl: process.env.POCKETBASE_URL || '',
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
  disconnectGracePolls: parseInt(process.env.DISCONNECT_GRACE_POLLS || '30', 10),
  frontendUrl: process.env.FRONTEND_URL || ''
};
