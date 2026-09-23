import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import trackerRoutes from './routes/tracker.routes.js';
import { monitorService } from './services/monitor.service.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS']
}));

app.use(express.json());

app.use('/api', trackerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(config.port, async () => {
  await monitorService.start();
});
